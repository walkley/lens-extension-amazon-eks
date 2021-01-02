import { LensMainExtension } from "@k8slens/extensions";

export default class EKSExtensionMain extends LensMainExtension {
  onActivate() {
    console.log('lens-extension-amazon-eks activated');
  }

  onDeactivate() {
    console.log('lens-extension-amazon-eks de-activated');
  }
}
