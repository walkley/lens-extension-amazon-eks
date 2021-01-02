import { LensRendererExtension, Component, K8sApi } from "@k8slens/extensions";
import { IRSADetails } from "./src/iam-role-service-account-details"
import { IAM_OIDC_Feature } from "./src/iam-oidc-provider-feature"
import React from "react"

export default class EKSExtension extends LensRendererExtension {
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
      feature: new IAM_OIDC_Feature()
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
