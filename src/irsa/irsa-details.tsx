import { Component, K8sApi, Store } from "@k8slens/extensions";
import React from "react";
import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import { EKSCluster } from "../eks"
import { tokenRequestApi, TokenRequest } from "../kube-token-request";
import { IRSARole } from "./irsa-store";

const IAM_ROLE_ARN_REGEX = /^arn:(.+):iam::\d+:role\/(.+)/g;
const IAM_ROLE_URL_PREFIX = "https://console.aws.amazon.com/iam/home#/roles/";
const IAM_ROLE_CN_URL_PREFIX = "https://console.amazonaws.cn/iam/home?#/roles/";

@observer
export class IRSADetails extends React.Component<Component.KubeObjectDetailsProps<K8sApi.ServiceAccount>> {
  @observable irsaStatus = "Unknown";

  @computed get iamRole(): string {
    return IRSARole(this.props.object);
  }

  private generateIAMRoleURL(iamARN: string): string {
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

  private checkIRSAStatuss = async () => {
    if (!this.iamRole) {
      console.log("invalid IAM Role", this);
      this.irsaStatus = "Invalid";
      return;
    }

    const tokenRequest = await tokenRequestApi.createToken(this.props.object.getName(), this.props.object.getNs(), {
      spec: {
        audiences: ["sts.amazonaws.com"],
        expirationSeconds: 86400
      }
    });

    const cluster = Store.clusterStore.getById(Store.workspaceStore.currentWorkspace.activeClusterId);
    const eksCluster = await EKSCluster.retrieveEKSCluster(cluster);
    if (await eksCluster.isValideToken(this.iamRole, tokenRequest.status.token)) {
      this.irsaStatus = "Valid";
    }
  }

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
              onClick={this.checkIRSAStatuss}
            />
          </div>
        </Component.DrawerItem>
      </div>
    )
  }
}
