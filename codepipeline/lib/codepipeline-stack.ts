import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { Repository } from 'aws-cdk-lib/aws-codecommit'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines'

export class CodepipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repo = new Repository(this, 'Repository', {
      repositoryName: 'SampleRepository',
      description: 'This is sample repository for the project.'
    })

    // const validatePolicy = new PolicyStatement({
    //   actions: [
    //     'cloudformation:DescribeStacks',
    //     'events:DescribeEventBus'
    //   ],
    //   resources: ['*']
    // })

    const pipeline = new CodePipeline(this, 'Pipeline', {
      crossAccountKeys: true,
      enableKeyRotation: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.codeCommit(repo, 'main'),
        installCommands: [
          'make warming'
        ],
        commands: [
          'make build'
        ]
      })
    })

    // Output
    new CfnOutput(this, 'RepositoryName', {
      value: repo.repositoryName
    })
  }
}
