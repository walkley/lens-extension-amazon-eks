import { Component, LensRendererExtension, K8sApi } from "@k8slens/extensions";
import React from "react";
import { irsaStore, IRSARole } from "./irsa-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  iam_role = "iam_role",
}

export class IAMRoleforServiceAccountPage extends React.Component<{ extension: LensRendererExtension }> {

  render() {
    return (
      <>
        <Component.KubeObjectListLayout
          isConfigurable
          tableId="access_service_accounts"
          className="ServiceAccounts" store={irsaStore}
          sortingCallbacks={{
            [columnId.name]: (account: K8sApi.ServiceAccount) => account.getName(),
            [columnId.namespace]: (account: K8sApi.ServiceAccount) => account.getNs(),
            [columnId.iam_role]: (account: K8sApi.ServiceAccount) => IRSARole(account),
          }}
          searchFilters={[
            (account: K8sApi.ServiceAccount) => account.getSearchFields(),
          ]}
          renderHeaderTitle="Service Accounts"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "IAM Role", className: "iam_role", sortBy: columnId.iam_role, id: columnId.iam_role },
          ]}
          renderTableContents={(account: K8sApi.ServiceAccount) => [
            account.getName(),
            account.getNs(),
            IRSARole(account),
          ]}
        />
      </>
    );
  }
}