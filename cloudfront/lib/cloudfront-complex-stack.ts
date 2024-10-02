import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput } from "aws-cdk-lib";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class CloudfrontComplexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket
    const bucket = new s3.Bucket(this, 'HostingBucket', {
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // not production
    });
    const logBucket = new s3.Bucket(this, 'LogBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // not production
      // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html
      // > Your bucket must have access control list (ACL) enabled. If you choose a bucket without ACL enabled from the CloudFront console, an error message will appear.
      // The S3 bucket that you specified for CloudFront logs does not enable ACL access: xxxxxx.s3.ap-northeast-1.amazonaws.com
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
    });

    // CloudFront
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      additionalBehaviors: {
        '/api': {
          // no cache because dynamic content
          origin: new origins.HttpOrigin('example.com'),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      defaultBehavior: {
        // cache static content
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      logBucket: logBucket,
    });

    new CfnOutput(this, 'Distribution DomainName', { value: distribution.domainName })
  }
}
