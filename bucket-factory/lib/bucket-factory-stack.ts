import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ConstructsFactories } from '@aws-solutions-constructs/aws-constructs-factories'; 
import * as s3 from 'aws-cdk-lib/aws-s3';

export class BucketFactoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const factories = new ConstructsFactories(this, 'constructs-factories');
    const response = factories.s3BucketFactory('wa-bucket', {});

    const normalBucket = new s3.Bucket(this, 'n-bucket');

    new cdk.CfnOutput(this, 'wa-bucket-name', {
      value: response.s3Bucket.bucketName,
    });
    new cdk.CfnOutput(this, 'wa-log-bucket-name', {
      value: response.s3LoggingBucket?.bucketName ?? 'no-logging-bucket',
    });
    new cdk.CfnOutput(this, 'normal-bucket-name', {
      value: normalBucket.bucketName,
    });
  }
}
