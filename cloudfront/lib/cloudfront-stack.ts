import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from "aws-cdk-lib";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class CloudfrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket
    const bucket = new s3.Bucket(this, 'HostingBucket', {
      // bucketName: '20240913-angel-calendar',
      enforceSSL: true,
    });

    // CloudFront
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        // OAC
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      },
    });

    new CfnOutput(this, 'Distribution DomainName', { value: distribution.domainName })
  }
}
