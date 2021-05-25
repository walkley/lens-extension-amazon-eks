import { LensRendererExtension, Component, K8sApi, Store} from "@k8slens/extensions";
import { IRSADetails } from "./src/irsa/irsa-details"
import { IamOidcFeature } from "./src/iam-oidc-provider-feature"
import { AddEksClusterPage, AddEksClusterIcon } from "./src/add-eks-cluster"
import { EksClusterSettingsPage, EksIcon } from "./src/eks-cluster-settings"
import { IAMRoleforServiceAccountPage } from "./src/irsa/irsa-page";
import React from "react"


const EKS_URL_REGREX = /https:\/\/\w+\.\w+\.([\w-]+)\.eks\.amazonaws\.com.*/g;

export default class EKSExtension extends LensRendererExtension {

  isEnabledForCluster(cluster: Store.Cluster): Promise<Boolean> {
    const matches = [...cluster.apiUrl.matchAll(EKS_URL_REGREX)]?.[0];
    return Promise.resolve(matches?.length === 2);
  }

  globalPages = [
    {
      id: "add-eks-cluster",
      components: {
        Page: () => <AddEksClusterPage extension={this}/>,
      }
    }
  ];

  globalPageMenus = [
    {
      target: { pageId: "add-eks-cluster" },
      title: "Add Amazon EKS Cluster",
      components: {
        Icon: AddEksClusterIcon,
      }
    },
  ];


  clusterPages = [
    {
      id: "eks-settings",
      components: {
        Page: () => <EksClusterSettingsPage cluster={Store.clusterStore.activeCluster}/>,
      }
    },
    {
      id: "irsa",
      components: {
        Page: () => <IAMRoleforServiceAccountPage extension={this} />,
        //MenuIcon: CertificateIcon,
      }
    }
  ]

  clusterPageMenus = [
    {
      id: "eks",
      title: "Amazon EKS",
      components: {
        Icon: EksIcon,
      }
    },
    {
      parentId: "eks",
      target: { pageId: "eks-settings" },
      title: "EKS Cluster Settings",
      components: {
        Icon: EksIcon,
      }
    },
    {
      parentId: "eks",
      target: { pageId: "irsa" },
      title: "IAM Role for Service Account",
      components: {
        Icon: EksIcon,
      }
    }
  ]

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
