import { Component, K8sApi } from "@k8slens/extensions";
import { apiKubePrefix, isDevelopment } from "@k8slens/extensions/dist/src/common/vars";
import { KubeJsonApiData, KubeJsonApi } from "@k8slens/extensions/dist/src/renderer/api/kube-json-api";
import React from "react";
import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import { IAMRoleServiceAccount } from "./eks"

const IRSA_ANNOTATION_PREFIX = "eks.amazonaws.com/role-arn=";
const IAM_ROLE_ARN_REGEX = /^arn:(.+):iam::\d+:role\/(.+)/g;
const IAM_ROLE_URL_PREFIX = "https://console.aws.amazon.com/iam/home#/roles/";
const IAM_ROLE_CN_URL_PREFIX = "https://console.amazonaws.cn/iam/home?#/roles/";

interface ServiceAccountToken extends KubeJsonApiData {
  spec: {
    audiences: [string],
    expirationSeconds: number,
    boundObjectRef: object
  },
  status: {
    token: string,
    expirationTimestamp: string
  }
}

const apiKube = new KubeJsonApi({
  apiBase: apiKubePrefix,
  debug: isDevelopment,
});

@observer
export class IRSADetails extends React.Component<Component.KubeObjectDetailsProps<K8sApi.ServiceAccount>> {
  @observable irsaStatus = "Unknown";

  @computed get iamRole(): string {
    return this.props.object.getAnnotations().find(a => a.startsWith(IRSA_ANNOTATION_PREFIX))?.substr(IRSA_ANNOTATION_PREFIX.length);
  }
  // @disposeOnUnmount
  // checkIRSA = autorun(async () => {
  //   this.irsaValid = false;
  //   if (!this.IRSA) {
  //     return;
  //   }

  //   console.log("before post...");
  //   const res = await apiKube.post<ServiceAccountToken>(this.props.object.selfLink + '/token', {
  //     data: {
  //       spec: {
  //         audiences: ["sts.amazonaws.com"],
  //         expirationSeconds: 86400
  //       }
  //     }
  //   });
  //   console.log("SA token:", res.status.token);
  //   this.irsaValid = await IAMRoleServiceAccount.isValideToken(this.IRSA, res.status.token);
  //   console.log("checkIRSA result:", this.irsaValid);
  // });

  generateIAMRoleURL(iamARN: string): string {
    const matches = [...iamARN.matchAll(IAM_ROLE_ARN_REGEX)]?.[0];
    if (matches?.length !== 3)
      return '';
    else if (matches[1] == "aws")
      return IAM_ROLE_URL_PREFIX + matches[2];
    else if (matches[1] == "aws-cn")
      return IAM_ROLE_CN_URL_PREFIX + matches[2];
    else
      return '';
  }

  checkIRSAStatus = () => {
    if (!this.iamRole) {
      console.log("invalid IAM Role", this);
      this.irsaStatus = "Invalid";
      return;
    }

    apiKube.post<ServiceAccountToken>(this.props.object.selfLink + '/token', {
      data: {
        spec: {
          audiences: ["sts.amazonaws.com"],
          expirationSeconds: 86400
        }
      }
    }).then((res: ServiceAccountToken) => {
      IAMRoleServiceAccount.isValideToken(this.iamRole, res.status.token).then((valid: boolean) => {
        this.irsaStatus = "Valid";
      });
    });
  };

  render() {
    const iamRole = this.iamRole;

    return (iamRole !== undefined &&
      <div>
        <Component.DrawerTitle title="IAM Role for Service Account" />
        <Component.DrawerItem name="IAM Role">
          <a href={this.generateIAMRoleURL(iamRole)} target="_blank" rel="noreferrer">
            {iamRole}
          </a>
        </Component.DrawerItem>
        <Component.DrawerItem name="Status">
          <div className="flex gaps align-center">
            <span>{this.irsaStatus}</span>
            <Component.Icon
              small material="fact_check"
              tooltip="Show value"
              onClick={this.checkIRSAStatus}
            />
          </div>
        </Component.DrawerItem>
      </div>
    )
  }
}
