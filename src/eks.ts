import { defaultProvider as credentialDefaultProvider } from "@aws-sdk/credential-provider-node";
import { NodeHttpHandler, streamCollector } from "@aws-sdk/node-http-handler";
import { EKSClient, ListClustersCommand, DescribeClusterCommand } from "@aws-sdk/client-eks";
import { IAMClient, GetOpenIDConnectProviderCommand, DeleteOpenIDConnectProviderCommand, CreateOpenIDConnectProviderCommand } from "@aws-sdk/client-iam";
import { STSClient, GetCallerIdentityCommand, AssumeRoleWithWebIdentityCommand } from "@aws-sdk/client-sts";
import { Store } from "@k8slens/extensions";
import * as tls from 'tls';
import * as url from 'url';

const EKS_URL_REGREX = /https:\/\/\w+\.\w+\.([\w-]+)\.eks\.amazonaws\.com.*/g;
const IAM_ARN_REGRES = /(arn:[\w-]+:iam::\d+:).+/g;
const EKS_PROP_ENTRY = 'eksProp';

const Default_Client_Config = {
  logger: console,
  //credentialDefaultProvider,
  runtime: 'node',
  requestHandler: new NodeHttpHandler(),
  streamCollector
};

export interface EKSClusterProp {
  clusterName: string;
  oidcIssuer: string;
  accountArn: string;
  region: string;
  profile: string;
}

function guessIAMProfile(cluster: Store.Cluster): string {
  
  class _TempCluster extends Store.Cluster {
    constructor(model: Store.ClusterModel) {
      super(model);
    }

    guessProfile(): string {
      const kc = this.getKubeconfig();
      const args: [string] = kc.getUser(kc.getContextObject(cluster.contextName)?.user)?.exec?.args;
      const profileIdx = args?.indexOf("--profile");
      if (profileIdx !== undefined && profileIdx >= 0 && args.length > profileIdx + 1) {
        return args[profileIdx + 1];
      } else {
        return "default";
      }
    }
  }

  return (new _TempCluster(cluster)).guessProfile();
}

function findIntRootCACertificate(certificate: tls.DetailedPeerCertificate): tls.DetailedPeerCertificate {
  let cert = certificate;
  let prevCert = cert?.issuerCertificate;

  // The trusted root cert is the last cert in the chain, and it repeats itself as the issuer.
  // The intermediate root CA cert is the second to last cert in the chain.
  while (cert?.fingerprint !== cert?.issuerCertificate?.fingerprint) {
    prevCert = cert;
    cert = cert.issuerCertificate;
  }
  return prevCert;
}

async function downloadThumbprint(issuerUrl: string): Promise<string> {
  //console.log(`downloading certificate authority thumbprint for ${issuerUrl}`);
  return new Promise<string>((ok, ko) => {
    const purl = url.parse(issuerUrl);
    const port = purl.port ? parseInt(purl.port, 10) : 443;
    if (!purl.host) {
      return ko(new Error(`unable to determine host from issuer url ${issuerUrl}`));
    }
    //console.log(`tls.connect: ${purl.host}:${port}`);
    const socket = tls.connect(port, purl.host, { rejectUnauthorized: false, enableTrace: true });
    socket.once('error', ko);
    socket.once('secureConnect', () => {
      socket.end();
      const fingerprint = findIntRootCACertificate(socket.getPeerCertificate(true)).fingerprint;
      const thumbprint = fingerprint.split(':').join('').toLowerCase();
      //console.log(`certificate authority thumbprint for ${issuerUrl} is ${thumbprint}`);
      ok(thumbprint);
    });
  });
}

export class EKSCluster {
  private eksProp: EKSClusterProp;

  private constructor() {
  }

  public static async retrieveEKSCluster(cluster: Store.Cluster): Promise<EKSCluster> {
    const eksCluster = new EKSCluster();
    eksCluster.eksProp = <EKSClusterProp>cluster.metadata[EKS_PROP_ENTRY];
    if (!eksCluster.eksProp) {
      await eksCluster.Setup(cluster);
      cluster.metadata[EKS_PROP_ENTRY] = eksCluster.eksProp;
    }

    return eksCluster;
  }

  public get prop() {
    return this.eksProp;
  }

  private async Setup(cluster: Store.Cluster) {
    // check eks api endpoint then get region from URL.
    const matches = [...cluster.apiUrl.matchAll(EKS_URL_REGREX)]?.[0];
    if (matches?.length !== 2) {
      console.error("Invalid EKS API URL: ", cluster.apiUrl);
      return;
    }
    const region = matches[1];

    // guess aws profile from exec parameters in kubeconfig.
    const profile = guessIAMProfile(cluster);

    // call eks api to get oidcIssurer and clustername by loop through eks cluster list the check its api url.
    let oidcIssuer = undefined;
    let clusterName = undefined;
    try {
      const credentials = credentialDefaultProvider({ profile });
      const eksClient = new EKSClient({ ...Default_Client_Config, region, credentials });
      const listClustersCmd = new ListClustersCommand({});
      const clustersRes = await eksClient.send(listClustersCmd);
      //console.log("eks config:", this.eksClient.config);
      //console.log(clustersRes.clusters.join('\n'));
      for (const name of clustersRes.clusters) {
        const descClusterRes = await eksClient.send(new DescribeClusterCommand({ name }));
        if (descClusterRes?.cluster?.endpoint?.toUpperCase() === cluster.apiUrl.toUpperCase()) {
          clusterName = name;
          oidcIssuer = descClusterRes.cluster?.identity?.oidc?.issuer;
          break;
        }
      };

      const stsClient = new STSClient({ ...Default_Client_Config, region, credentials });
      const accountArn = (await stsClient.send(new GetCallerIdentityCommand({})))?.Arn;
      this.eksProp = { clusterName, oidcIssuer, accountArn, region, profile };
    } catch (err) {
      console.error(err);
    }
  }

  private GetOidcIssuerUrl(): string {
    if (this.eksProp.oidcIssuer?.startsWith("https://")) {
      return this.eksProp.oidcIssuer.substr(8);
    }
  }

  private GetOIDCProviderArn(): string {
    const matches = [...this.eksProp.accountArn.matchAll(IAM_ARN_REGRES)]?.[0];
    const issuerUrl = this.GetOidcIssuerUrl();
    if (matches?.length === 2 && issuerUrl) {
      const iamPrefix = matches[1];
      return `${iamPrefix}oidc-provider/${issuerUrl}`;
    } else {
      console.error("Failed to GetOIDCProviderArn:", matches, issuerUrl);
    }
  }



  /**
   * Check if this EKS cluster has associated IAM OIDC provider.
   * by comparing searching IAM OIDC Provider with matched OIDC issuer.
   */
  async hasAssosiatedOIDCProvider(): Promise<boolean> {
    const OpenIDConnectProviderArn = this.GetOIDCProviderArn();
    const issuerUrl = this.GetOidcIssuerUrl();
    if (OpenIDConnectProviderArn && issuerUrl) {
      try {
        const credentials = credentialDefaultProvider({ profile: this.eksProp.profile });
        const iamClient = new IAMClient({ ...Default_Client_Config, region: this.eksProp.region, credentials });
        const res = await iamClient.send(new GetOpenIDConnectProviderCommand({ OpenIDConnectProviderArn }));
        if (res.Url === issuerUrl) {
          //console.log("OIDCProvider Assosiated: ", issuerUrl);
          return true;
        }
      } catch (err) {
        //console.error(err);
        return false;
      }
    }
    return false;
  }

  async deleteAssosiatedOIDCProvider(): Promise<void> {
    const OpenIDConnectProviderArn = this.GetOIDCProviderArn();
    const issuerUrl = this.GetOidcIssuerUrl();
    if (OpenIDConnectProviderArn && issuerUrl) {
      const credentials = credentialDefaultProvider({ profile: this.eksProp.profile });
      const iamClient = new IAMClient({ ...Default_Client_Config, region: this.eksProp.region, credentials });
      const res = await iamClient.send(new DeleteOpenIDConnectProviderCommand({ OpenIDConnectProviderArn }));
      if (res) {
        console.log(res);
        console.log("OIDCProvider Deleted: ", issuerUrl);
      }
    }
  }

  async createAssosiatedOIDCProvider(): Promise<void> {
    const OpenIDConnectProviderArn = this.GetOIDCProviderArn();
    const issuerUrl = this.GetOidcIssuerUrl();
    if (OpenIDConnectProviderArn && issuerUrl) {
      const credentials = credentialDefaultProvider({ profile: this.eksProp.profile });
      const iamClient = new IAMClient({ ...Default_Client_Config, region: this.eksProp.region, credentials });
      const thumbprint = await downloadThumbprint(this.eksProp.oidcIssuer);
      console.log("thumbprint", thumbprint);
      const res = await iamClient.send(new CreateOpenIDConnectProviderCommand({
        Url: this.eksProp.oidcIssuer,
        ClientIDList: ["sts.amazonaws.com"],
        ThumbprintList: [thumbprint]
      }));
      if (res) {
        console.log(res);
        console.log("OIDCProvider Created: ", res?.OpenIDConnectProviderArn);
      }
    }
  }
}

export class IAMRoleServiceAccount {
  static async isValideToken(roleArn: string, token: string): Promise<boolean> {
    const stsClient = new STSClient({ ...Default_Client_Config, region: 'us-east-1' });
    const res = await stsClient.send(new AssumeRoleWithWebIdentityCommand({
      RoleArn: roleArn,
      RoleSessionName: "irsa-test-lens",
      WebIdentityToken: token,
      DurationSeconds: 900
    }));
    //console.log("AssumeRoleWithWebIdentity result:", res);
    return res.$metadata?.httpStatusCode === 200;
  }
}