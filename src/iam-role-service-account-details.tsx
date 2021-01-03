import { Component, K8sApi } from "@k8slens/extensions";
import React from "react";
import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import { IAMRoleServiceAccount } from "./eks"
import { tokenRequestApi, TokenRequest } from "./kube-token-request";

const IRSA_ANNOTATION_PREFIX = "eks.amazonaws.com/role-arn=";
const IAM_ROLE_ARN_REGEX = /^arn:(.+):iam::\d+:role\/(.+)/g;
const IAM_ROLE_URL_PREFIX = "https://console.aws.amazon.com/iam/home#/roles/";
const IAM_ROLE_CN_URL_PREFIX = "https://console.amazonaws.cn/iam/home?#/roles/";

@observer
export class IRSADetails extends React.Component<Component.KubeObjectDetailsProps<K8sApi.ServiceAccount>> {
  @observable irsaStatus = "Unknown";

  @computed get iamRole(): string {
    return this.props.object.getAnnotations().find(a => a.startsWith(IRSA_ANNOTATION_PREFIX))?.substr(IRSA_ANNOTATION_PREFIX.length);
  }

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
    //console.log("sa object", this.props.object);
    //console.log("serviceAccountsApi", K8sApi.serviceAccountsApi);

    if (!this.iamRole) {
      console.log("invalid IAM Role", this);
      this.irsaStatus = "Invalid";
      return;
    }

    tokenRequestApi.createToken(this.props.object.getName(), this.props.object.getNs(), {
      spec: {
        audiences: ["sts.amazonaws.com"],
        expirationSeconds: 86400
      }
    }).then((res: TokenRequest) => {
      //console.log("ServiceAccountToken", res);
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
