import { RemovalPolicy, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export class S3Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const simpleBucket = new s3.Bucket(this, 'SimpleBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CfnOutput(this, 'SimpleBucketOutput', {
      value: simpleBucket.bucketName,
    });

    // enable encryption for the bucket using a KMS key
    const cmk = new kms.Key(this, 'BucketEncryptionKey', {
      description: 'CMK for bucket encryption',
      enableKeyRotation: false,
    });
    const encryptedBucket = new s3.Bucket(this, 'EncryptedBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: cmk,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CfnOutput(this, 'EncryptedBucketOutput', {
      value: encryptedBucket.bucketName,
    });

    // for web site hosting
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: 'index.html',
    });

    new CfnOutput(this, 'WebBucketOutput', {
      value: webBucket.bucketName,
    });
  }
}
