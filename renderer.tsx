import { LensRendererExtension, Component, K8sApi, Store} from "@k8slens/extensions";
import { IRSADetails } from "./src/iam-role-service-account-details"
import { IamOidcFeature } from "./src/iam-oidc-provider-feature"
//import { EksClusterSettingsPage, EksIcon } from "./src/eks-cluster-settings"
import React from "react"


const EKS_URL_REGREX = /https:\/\/\w+\.\w+\.([\w-]+)\.eks\.amazonaws\.com.*/g;

export default class EKSExtension extends LensRendererExtension {

  isEnabledForCluster(cluster: Store.Cluster): Promise<Boolean> {
    const matches = [...cluster.apiUrl.matchAll(EKS_URL_REGREX)]?.[0];
    return Promise.resolve(matches?.length === 2);
  }

  // clusterPages = [
  //   {
  //     id: "eks-settings",
  //     components: {
  //       Page: () => <EksClusterSettingsPage cluster={Store.clusterStore.activeCluster}/>,
  //     }
  //   }
  // ]

  // clusterPageMenus = [
  //   {
  //     id: "eks",
  //     title: "Amazon EKS",
  //     components: {
  //       Icon: EksIcon,
  //     }
  //   },
  //   {
  //     parentId: "eks",
  //     target: { pageId: "eks-settings" },
  //     title: "EKS Cluster Settings",
  //     components: {
  //       Icon: EksIcon,
  //     }
  //   }
  // ]

  clusterFeatures = [
    {
      title: "Associate IAM OIDC Provider",
      components: {
        Description: () => {
          return (
            <span>
              Setup IAM OIDC provider for a cluster to enable IAM roles for pods.
            </span>
          )
        }
      },
      feature: new IamOidcFeature()
    }
  ]

  kubeObjectDetailItems = [
    {
      kind: "ServiceAccount",
      apiVersions: ["v1"],
      priority: 100,
      components: {
        Details: (props: Component.KubeObjectDetailsProps<K8sApi.ServiceAccount>) => <IRSADetails {...props} />
      }
    }
  ]
}
