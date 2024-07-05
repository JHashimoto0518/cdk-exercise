import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { Repository } from 'aws-cdk-lib/aws-codecommit'
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Bucket } from 'aws-cdk-lib/aws-s3';

export class CodeBuildStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repo = new Repository(this, 'Repository', {
      repositoryName: 'SampleRepForCodeBuild',
      description: 'This is sample repository for the project.'
    })

    const srcBucket = new Bucket(this, 'SourceBucket', {
      bucketName: 'codebuild-source-bucket',
      versioned: true
    })

    // CodeBuild project that builds the Docker image
    const buildTest = new codebuild.Project(this, "BuildTest", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yaml"),
      source: codebuild.Source.codeCommit({ repository: repo, branchOrRef: 'main', cloneDepth: 0 }),
      secondarySources: [codebuild.Source.s3({ bucket: srcBucket, path: 'source', identifier: 'source' })],
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
      }
    });

    // Output
    new CfnOutput(this, 'RepositoryName', {
      value: repo.repositoryName
    })
  }
}
