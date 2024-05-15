import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc, SubnetType, InstanceType, InstanceClass, InstanceSize, MachineImage, Instance, Port } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, ApplicationProtocol, ListenerAction } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_tg from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets'
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
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
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
    const ec2Instance1 = new Instance(this, 'EC2Instance1', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2023(),
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
    ec2Instance1.connections.allowFrom(alb, Port.tcp(80), 'Allow inbound traffic on port 80 from the ALB only');

    const ec2Instance2 = new Instance(this, 'EC2Instance2', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux2023(),
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
    ec2Instance2.connections.allowFrom(alb, Port.tcp(80), 'Allow inbound traffic on port 80 from the ALB only');

    // Add the instances to the ALB target group
    listener.addTargets('EC2Targets', {
      port: 80,
      targets: [new elbv2_tg.InstanceTarget(ec2Instance1), new elbv2_tg.InstanceTarget(ec2Instance2)],
    });
  }
}
