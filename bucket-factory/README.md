# How to use s3BucketFactory

create a new project.

```bash
mkdir bucket-factory
cd bucket-factory/
npx cdk init -l typescript
```

install aws-constructs-factories.

```bash
npm i @aws-solutions-constructs/aws-constructs-factories
```

if you get an error like the following, update aws-cdk-lib to the latest version.

```bash
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR!
npm ERR! While resolving: bucket-factory@0.1.0
npm ERR! Found: aws-cdk-lib@2.158.0
npm ERR! node_modules/aws-cdk-lib
npm ERR!   aws-cdk-lib@"2.158.0" from the root project
npm ERR!
npm ERR! Could not resolve dependency:
npm ERR! peer aws-cdk-lib@"^2.161.0" from @aws-solutions-constructs/aws-constructs-factories@2.74.0
npm ERR! node_modules/@aws-solutions-constructs/aws-constructs-factories
npm ERR!   @aws-solutions-constructs/aws-constructs-factories@"*" from the root project
```

```bash
npm i aws-cdk@latest aws-cdk-lib@latest
```

## Fix: Bootstrap stack outdated

If you get a notice like the following, run the following command.

```bash
NOTICES         (What's this? https://github.com/aws/aws-cdk/wiki/CLI-Notices)

31885   (cli): Bootstrap stack outdated

        Overview: The bootstrap stack in aws://533267060632/ap-northeast-1 is outdated.
                  We recommend at least version 21, distributed with CDK CLI
                  2.149.0 or higher. Please rebootstrap your environment by
                  runing 'cdk bootstrap aws://533267060632/ap-northeast-1'

        Affected versions: bootstrap: <21

        More information at: https://github.com/aws/aws-cdk/issues/31885
```

```bash
npx cdk bootstrap aws://<your-account-id>/ap-northeast-1 --profile <your-profile-name>
```
