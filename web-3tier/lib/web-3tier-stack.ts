import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_tg from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class Web3TierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Custom domain name
    const domainName = 'web.jhashimoto.net'; // Replace with your own domain name

    // Create public hosted zone
    const myHostedZone = new route53.HostedZone(this, 'MyHostedZone', {
      zoneName: domainName,
    });

    // Create ACM certificate
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      // Add CNAME record to external DNS provider manually
      // See: https://docs.aws.amazon.com/ja_jp/acm/latest/userguide/dns-validation.html
      validation: acm.CertificateValidation.fromDns()
    });

    // Create vpc
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

    // Create security groups
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

    // Create ec2
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

    // Create alb
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      internetFacing: true,
      vpc,
      vpcSubnets: {
        subnets: vpc.publicSubnets
      },
      securityGroup: albSg
    })

    // Create HTTPS listener
    const listener = alb.addListener('Listener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [certificate],
    });
    listener.addTargets('AppTarget', {
      targets: [new elbv2_tg.InstanceTarget(ec2Ins)],
      port: 80
    })

    // Create alias record
    const albAliasRecord = new route53.ARecord(this, 'AlbAliasRecord', {
      zone: myHostedZone,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
    });

    // fix: HostedZoneNotEmptyException - The specified hosted zone contains non-required resource record sets and so cannot be deleted.
    albAliasRecord.node.addDependency(myHostedZone)
    
    // Output alb test command
    new cdk.CfnOutput(this, 'AlbTestCommand', {
      value: `curl -I https://${albAliasRecord.domainName}`
    })
  }
}
