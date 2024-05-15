import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class EventbridgeLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFn = new lambda.Function(this, 'Hello', {
      code: new lambda.InlineCode('def main(event, context): return "Hello from Lambda!"'),
      handler: 'index.main',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.PYTHON_3_11,
    });

    const rule = new events.Rule(this, 'Rule', {
      // every minute
      schedule: events.Schedule.expression('cron(* * ? * * *)')
    });

    rule.addTarget(new targets.LambdaFunction(lambdaFn));
  }
}
