import { LensRendererExtension, Component, Util, Navigation } from "@k8slens/extensions";
import { loadSharedConfigFiles, ParsedIniData } from "@aws-sdk/shared-ini-file-loader";
import React from "react"
import content from "./eks_add.svg";
import { observer } from "mobx-react";
import { observable } from "mobx";
import { getRegions, getClusters, addCluster } from "./eks";


interface SubTitleProps {
  className?: string;
  title: React.ReactNode;
  compact?: boolean; // no bottom padding
}

class SubTitle extends React.Component<SubTitleProps> {
  render() {
    const { compact, title, children } = this.props;
    let { className } = this.props;

    className = Util.cssNames("SubTitle", className, {
      compact,
    });

    return (
      <div className={className}>
        {title} {children}
      </div>
    );
  }
}

export function AddEksClusterIcon(props: Component.IconProps) {
  const iconContent = <span className="icon" dangerouslySetInnerHTML={{ __html: content }} />;
  return (<Component.Icon {...props} big children={iconContent} />);
}

@observer
export class AddEksClusterPage extends React.Component<{ extension: LensRendererExtension }> {
  configFile: ParsedIniData;
  @observable profilesList = ["default"];
  @observable regionsList: string[] = ["us-east-1"];
  @observable clustersList: string[] = [];
  @observable profile = "default";
  @observable region = "us-east-1";
  @observable cluster = "";
  @observable alias = "";

  componentDidMount() {
    loadSharedConfigFiles().then(sharedConfigFiles => {
      this.configFile = sharedConfigFiles.configFile;
      const profilesList = Object.keys(this.configFile);
      if (profilesList?.length > 0) {
        this.profilesList = profilesList;
        this.profile = this.configFile.hasOwnProperty(this.profile) ? this.profile : profilesList[0];
        if (this.configFile[this.profile].hasOwnProperty("region")) {
          this.region = this.configFile[this.profile]["region"];
        }
      }
      getRegions(this.profile, this.region).then((value: string[]) => { this.regionsList = value; });
      this.refreshClusters();
    });
  }

  refreshRegions = () => {
    if (this.configFile && this.configFile[this.profile]?.hasOwnProperty("region")) {
      this.region = this.configFile[this.profile]["region"];
    }
    getRegions(this.profile, this.region).then((value: string[]) => { this.regionsList = value; });
  }

  refreshClusters = () => {
    if (this.profile && this.region) {
      getClusters(this.profile, this.region).then((value: string[]) => { 
        this.clustersList = value;
        this.cluster = this.clustersList.length > 0 ? this.clustersList[0] : "";
        this.alias = this.cluster;
      });
    }
  }

  onAddClusters = () => {
    if (this.profile.length > 0 && this.region.length > 0 && this.cluster.length > 0) {
      addCluster(this.profile, this.region, this.cluster, this.alias).then( clusterId => {
        Navigation.navigate(`/cluster/${clusterId}`);
      })
    }
  }

  render() {
    return (
      <Component.PageLayout className="AddClusters" header={<h2>Add Amazon EKS Clusters</h2>}>
        <div>
          <SubTitle title="AWS Credential Profile" />
          <p>Select the credential profile.</p>
          <Component.Select
            id="profile-select"
            options={this.profilesList}
            value={this.profile}
            noOptionsMessage={() => `No contexts available or they have been added already`}
            onChange={({ value }: Component.SelectOption<string>) => {
              this.profile = value;
              this.refreshRegions();
              this.refreshClusters();
            }}
          />

          <SubTitle title="AWS Region" />
          <p>Select AWS region for EKS cluster.</p>
          <Component.Select
            id="region-select"
            options={this.regionsList}
            value={this.region}
            noOptionsMessage={() => `No contexts available or they have been added already`}
            onChange={({ value }: Component.SelectOption<string>) => {
              this.region = value;
              this.refreshClusters();
            }}
          />

          <SubTitle title="EKS Cluster" />
          <p>Select EKS cluster to be added.</p>
          <Component.Select
            id="cluster-select"
            options={this.clustersList}
            value={this.cluster}
            noOptionsMessage={() => `No clusters available or they have been added already`}
            onChange={({ value }: Component.SelectOption<string>) => {
              this.cluster = value;
            }}
          />

          <SubTitle title="Cluster Name" />
          <p>Input the cluster name to be added.</p>
          <Component.Input
            theme="round-black"
            value={this.alias}
            onChange={(value) => this.alias = value}
            //onBlur={this.onSavePath}
            placeholder="New_Cluster"
          />
        </div>

        <div className="actions-panel">
            <Component.Button
              primary
              disabled={ !(this.cluster?.length > 0 && this.alias?.length > 0) }
              label="Add cluster"
              onClick={this.onAddClusters}
              //waiting={this.isWaiting}
              //tooltip={submitDisabled ? "Select at least one cluster to add." : undefined}
              tooltipOverrideDisabled
            />
          </div>
      </Component.PageLayout>
    )
  }
}