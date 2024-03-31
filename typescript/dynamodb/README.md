# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## How to use CDK

create working dir:

```bash
mkdir <your-dir>
cd <your-dir>
```

create cdk project:

```bash
npx cdk init -l typescript
```

deploy cdk app:

```bash
npx cdk deploy
```

destroy cdk app:

```bash
npx cdk destroy
```
