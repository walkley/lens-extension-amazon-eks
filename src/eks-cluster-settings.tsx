import { Component, Store } from "@k8slens/extensions";
import { EKSCluster } from "./eks";
import { observable } from "mobx";
import { observer } from "mobx-react";
import path from "path";
import React from "react"

export function EksIcon(props: Component.IconProps) {
  return <Component.Icon {...props} material="pages" tooltip={path.basename(__filename)}/>
}

@observer
export class EksClusterSettingsPage extends React.Component<{ cluster: Store.Cluster }> {
  @observable eksCluster: EKSCluster;

  constructor(props: { cluster: Store.Cluster }) {
    super(props);
    EKSCluster.retrieveEKSCluster(props.cluster).then(eksCluster => { this.eksCluster = eksCluster });
    console.log("EksClusterSettingsPage Constructed");
  }

  async componentDidMount() {
    console.log("EksClusterSettingsPage.componentDidMount");
  }

  deactivate = () => {
    console.log("EksClusterSettingsPage.deactivate");
  };

  renderStatusRows() {
    const eksClusterProp = this.eksCluster.prop;
    const rows = [
      ["Cluster Name", eksClusterProp.clusterName],
      ["API server endpoint", this.props.cluster.apiUrl],
      ["OpenID Connect provider URL", eksClusterProp.oidcIssuer],
      ["Region", eksClusterProp.region],
      ["Profile", eksClusterProp.profile]
    ];

    return (
      <Component.Table scrollable={false}>
        {rows.map(([name, value]) => {
          return (
            <Component.TableRow key={name}>
              <Component.TableCell>{name}</Component.TableCell>
              <Component.TableCell className="value">{value}</Component.TableCell>
            </Component.TableRow>
          );
        })}
      </Component.Table>
    );
  }

  render() {
    console.log("render cluster: ", this.props.cluster.name);
    if (this.eksCluster === undefined) {
      console.log("not ready");
      return <Component.Spinner center/>;
    }

    const clusterName = this.props.cluster.name;
    const eksCluster = this.eksCluster;
    return <div>
      <h2>Status</h2>
      <p>
        Cluster status information including: detected distribution, kernel version, and online status.
      </p>
      <div className="status-table">
        {this.renderStatusRows()}
      </div>
    </div>;
  }
}