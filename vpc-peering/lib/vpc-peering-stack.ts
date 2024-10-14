import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VpcPeeringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // vpc
    const vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: 'vpc',
      ipAddresses: ec2.IpAddresses.cidr('172.16.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        }
      ],

      ipProtocol: ec2.IpProtocol.DUAL_STACK,
      ipv6Addresses: ec2.Ipv6Addresses.amazonProvided(),

      // remove all rules from default security group
      // See: https://docs.aws.amazon.com/config/latest/developerguide/vpc-default-security-group-closed.html
      restrictDefaultSecurityGroup: true,
    });

    // requester vpc
    const requesterVpc = new ec2.Vpc(this, 'RequesterVpc', {
      vpcName: 'requester-vpc',
      ipAddresses: ec2.IpAddresses.cidr('172.17.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        }
      ],

      ipProtocol: ec2.IpProtocol.DUAL_STACK,
      ipv6Addresses: ec2.Ipv6Addresses.amazonProvided(),

      restrictDefaultSecurityGroup: true,
    });

    // vpc peering connection
    const vpcPeeringConnection = new ec2.CfnVPCPeeringConnection(this, 'VpcPeeringConnection', {
      peerVpcId: requesterVpc.vpcId,
      vpcId: vpc.vpcId
    });
  }
}