# Lens Extension for Amazon EKS

<a href="https://github.com/walkley/lens-extension-amazon-eks"><img alt="GitHub Actions status" src="https://github.com/walkley/lens-extension-amazon-eks/workflows/Build%20testing/badge.svg"></a>

[Lens](https://github.com/lensapp/lens) extension for Amazon EKS that adds following features:

*  Create Amazon EKS clusters
*  Cluster feature: Associate IAM OIDC Provider
*  Service Account detail page: IAM Role for Service Account

## Demo

https://user-images.githubusercontent.com/6355087/120655946-c0efd580-c4b5-11eb-8d48-6218dce83146.mp4


## Build

To build the extension you can use `make` or run the `npm` commands manually:

```sh
mkdir -p ~/.k8slens/extensions
git clone https://github.com/walkley/lens-extension-amazon-eks.git
ln -s $(pwd)/lens-extension-amazon-eks ~/.k8slens/extensions/lens-extension-amazon-eks
cd lens-extension-amazon-eks
make build
```

OR

```sh
cd lens-extension-amazon-eks
npm install
npm run build
```

If you want to watch for any source code changes and automatically rebuild the extension you can use:

```sh
cd lens-extension-amazon-eks
npm run dev
```

## Test

Open Lens application and navigate to a cluster...
```sh
cd %USERPROFILE%\.k8slens\extensions
mklink /D lens-extension-amazon-eks \\wsl$\Ubuntu-20.04\home\walkley\lens-extension-amazon-eks
```

## Uninstall

```sh
rm ~/.k8slens/extensions/lens-extension-amazon-eks
```

Restart Lens application.
