import { RemovalPolicy, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_tg from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

// ref: certificate
// https://tech.dentsusoken.com/entry/replace_web_app_domain_using_cdk

export class AlbStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
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
      // remove all rules from default security group
      // See: https://docs.aws.amazon.com/config/latest/developerguide/vpc-default-security-group-closed.html
      restrictDefaultSecurityGroup: true,
    });

    // security group
    const nlbSg1 = new ec2.SecurityGroup(this, 'NlbSg1', {
      vpc,
      allowAllOutbound: true,
      description: 'security group 1 for nlb'
    })

    const nlbSg2 = new ec2.SecurityGroup(this, 'NlbSg2', {
      vpc,
      allowAllOutbound: true,
      description: 'security group 2 for nlb'
    })

    const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for alb'
    })
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow http traffic from anywhere')

    const ec2Sg = new ec2.SecurityGroup(this, 'Ec2Sg', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for ec2'
    })
    ec2Sg.connections.allowFrom(albSg, ec2.Port.tcp(80), 'allow http traffic from alb')

    // ec2
    const ec2Ins = new ec2.Instance(this, 'Ec2', {
      instanceName: 'ec2',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }),
      securityGroup: ec2Sg,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            encrypted: true
          }),
        },
      ],
    })

    // access log bucket
    const accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
      // https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
      // > The bucket must use Amazon S3-managed keys (SSE-S3).
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    // nlb
    const nlb = new elbv2.NetworkLoadBalancer(this, 'Nlb', {
      vpc,
      vpcSubnets: {
        subnets: vpc.publicSubnets
      },
      internetFacing: true,
      securityGroups: [nlbSg1, nlbSg2]
    })

    // alb
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      internetFacing: true,
      vpc,
      vpcSubnets: {
        subnets: vpc.publicSubnets
      },
      securityGroup: albSg
    })
    // enable access log
    alb.logAccessLogs(accessLogBucket, 'alb-access-log')

    const listener = alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP
    })
    listener.addTargets('AppTarget', {
      targets: [new elbv2_tg.InstanceTarget(ec2Ins)],
      port: 80
    })

    new CfnOutput(this, 'AlbTestCommand', {
      value: `curl -I http://${alb.loadBalancerDnsName}`
    })

    new CfnOutput(this, 'AlbAccessLogBucketName', {
      value: accessLogBucket.bucketName,
    })
  }
}
