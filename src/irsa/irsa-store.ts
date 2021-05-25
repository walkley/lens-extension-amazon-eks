import { K8sApi} from "@k8slens/extensions";

export const IRSA_ANNOTATION_PREFIX = "eks.amazonaws.com/role-arn=";

export function IRSARole(sa: K8sApi.ServiceAccount): string {
  return sa.getAnnotations().find(a => a.startsWith(IRSA_ANNOTATION_PREFIX))?.substr(IRSA_ANNOTATION_PREFIX.length);
}

export class IAMRoleServiceAccountStore extends K8sApi.KubeObjectStore<K8sApi.ServiceAccount> {
    api = K8sApi.serviceAccountsApi;

    protected filterItemsOnLoad(items: K8sApi.ServiceAccount[]) {
      return items.filter(item => IRSARole(item) != undefined);
    }
}

export const irsaStore = new IAMRoleServiceAccountStore();
K8sApi.apiManager.registerStore(irsaStore);
