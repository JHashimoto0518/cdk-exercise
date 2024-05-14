import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc, SubnetType, InstanceType, InstanceClass, InstanceSize, MachineImage } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, ApplicationProtocol, ListenerAction } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class MyVpcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new Vpc(this, 'MyVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          subnetType: SubnetType.PUBLIC,
          name: 'PublicSubnet',
        },
        {
          subnetType: SubnetType.PRIVATE_WITH_NAT,
          name: 'PrivateSubnet',
        },
      ],
    });

    // Create an Application Load Balancer
    const alb = new ApplicationLoadBalancer(this, 'MyALB', {
      vpc,
      internetFacing: true,
    });

    // Add a listener to the ALB
    const listener = alb.addListener('Listener', {
      protocol: ApplicationProtocol.HTTP,
      defaultAction: ListenerAction.fixedResponse(200, {
        contentType: 'text/plain',
        messageBody: 'Hello, world!',
      }),
    });

    // Add EC2 instances in the private subnets
    const ec2Instance1 = new ec2.Instance(this, 'EC2Instance1', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux(),
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      },
    });

    const ec2Instance2 = new ec2.Instance(this, 'EC2Instance2', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux(),
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      },
    });

    // Add the instances to the ALB target group
    listener.addTargets('EC2Targets', {
      port: 80,
      targets: [ec2Instance1, ec2Instance2],
    });
  }
}
