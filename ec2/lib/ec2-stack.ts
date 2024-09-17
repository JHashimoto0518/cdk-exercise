import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class Ec2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ebs volume
    const volume = new ec2.Volume(this, 'Volume', {
      availabilityZone: 'ap-northeast-1a',
      size: cdk.Size.gibibytes(8),
      encrypted: true,
    });
  }
}
