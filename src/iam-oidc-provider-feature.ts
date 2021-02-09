import { ClusterFeature, Store } from "@k8slens/extensions";
import { EKSCluster } from "./eks";

export class IamOidcFeature extends ClusterFeature.Feature {
  constructor() {
    super();
    //console.log("IAM_OIDC_Feature constructed.");
  }

  async install(cluster: Store.Cluster): Promise<void> {
    //super.applyResources(cluster, path.join(__dirname, "../resources/"));
    const eksCluster = await EKSCluster.retrieveEKSCluster(cluster);
    await eksCluster.createAssosiatedOIDCProvider();
    this.status.installed = true;
  }

  async upgrade(cluster: Store.Cluster): Promise<void> {
    return this.install(cluster);
  }

  async updateStatus(cluster: Store.Cluster): Promise<ClusterFeature.FeatureStatus> {
    //this.status.installed = false;
    this.status.canUpgrade = false;
    const eksCluster = await EKSCluster.retrieveEKSCluster(cluster);
    this.status.installed = await eksCluster.hasAssosiatedOIDCProvider();
    return this.status;
  }

  async uninstall(cluster: Store.Cluster): Promise<void> {
    const eksCluster = await EKSCluster.retrieveEKSCluster(cluster);
    await eksCluster.deleteAssosiatedOIDCProvider();
    this.status.installed = false;
  }
}

