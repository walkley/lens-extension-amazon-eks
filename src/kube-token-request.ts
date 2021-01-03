import { K8sApi } from "@k8slens/extensions";

export class TokenRequest extends K8sApi.KubeObject {
    static kind = "TokenRequest";
    static namespaced = true;
    static apiBase = "/api/v1/serviceaccounts";
  
    spec: {
      audiences: [string];
      expirationSeconds: number;
    };
  
    status: {
      token: string;
      expirationTimestamp: string;
    };
  };
  
  class TokenRequestApi extends K8sApi.KubeApi<TokenRequest> {
    constructor() {
      super({objectConstructor: TokenRequest});
    }
  
    async createToken(name: string, namespace: string, data?: Partial<TokenRequest>): Promise<TokenRequest> {
      const apiUrl = `${this.getUrl({name, namespace})}/token`;
      //console.log("apiUrl", apiUrl);
      return this.request
        .post(apiUrl, { data })
        .then(this.parseResponse);
    }
  }
  
  export const tokenRequestApi = new TokenRequestApi();