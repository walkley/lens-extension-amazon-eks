import { ClusterFeature, Store } from "@k8slens/extensions";
import { EKSCluster } from "./eks";

export class IAM_OIDC_Feature extends ClusterFeature.Feature {
  constructor() {
    super();
    console.log("IAM_OIDC_Feature constructed.");
  }

  private async retrieveEKSCluster(cluster: Store.Cluster): Promise<EKSCluster> {
    let eksCluster: EKSCluster;
    const clusterName: string = <string>cluster.metadata['eks-clusterName'];
    const oidcIssuer: string = <string>cluster.metadata['eks-oidcIssuer'];
    const accountArn: string = <string>cluster.metadata['eks-accountArn'];
    const region: string = <string>cluster.metadata['eks-region'];
    if (clusterName && oidcIssuer && accountArn && region) {
      eksCluster = EKSCluster.ImportEKSCluster({ clusterName, oidcIssuer, accountArn, region });
    } else {
      eksCluster = await EKSCluster.CreateEKSCluster(cluster.apiUrl);
      cluster.metadata['eks-clusterName'] = eksCluster.GetProp().clusterName;
      cluster.metadata['eks-oidcIssuer'] = eksCluster.GetProp().oidcIssuer;
      cluster.metadata['eks-accountArn'] = eksCluster.GetProp().accountArn;
      cluster.metadata['eks-region'] = eksCluster.GetProp().region;
    }

    return eksCluster;
  }

  async install(cluster: Store.Cluster): Promise<void> {
    //super.applyResources(cluster, path.join(__dirname, "../resources/"));
    const eksCluster = await this.retrieveEKSCluster(cluster);
    await eksCluster.createAssosiatedOIDCProvider();
  }

  async upgrade(cluster: Store.Cluster): Promise<void> {
    return this.install(cluster);
  }

  async updateStatus(cluster: Store.Cluster): Promise<ClusterFeature.FeatureStatus> {
    //this.status.installed = false;
    this.status.canUpgrade = false;

    // const cred = await credentialDefaultProvider()();
    // console.log("AK:", cred.accessKeyId)
    // console.log("updateStatus, cluster URL:", cluster.apiUrl);
    const eksCluster = await this.retrieveEKSCluster(cluster);
    this.status.installed = await eksCluster.hasAssosiatedOIDCProvider();
    return this.status;
  }

  async uninstall(cluster: Store.Cluster): Promise<void> {
    //const podApi = K8sApi.forCluster(cluster, K8sApi.Pod);
    //await podApi.delete({name: "example-pod", namespace: "default"});
    const eksCluster = await this.retrieveEKSCluster(cluster);
    await eksCluster.deleteAssosiatedOIDCProvider();
  }
}

