import { RemovalPolicy, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class S3Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const simpleBucket = new s3.Bucket(this, 'SimpleBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // for web site hosting
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
    });
  }
}
