import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_tg from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class Web3TierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Custom domain name
    const domainName = 'www.jhashimoto.net'; // Replace with your own domain name

    // Create public hosted zone
    const myHostedZone = new route53.HostedZone(this, 'MyHostedZone', {
      zoneName: domainName,
    });

    // Create ACM certificate
    const certificate = new acm.Certificate(this, 'Cert', {
      domainName: domainName,
      // Note: Add NS records to external DNS provider manually
      // See: https://docs.aws.amazon.com/ja_jp/acm/latest/userguide/dns-validation.html
      validation: acm.CertificateValidation.fromDns()
    });

    // Create CNAME record for ACM certificate
    new route53.CnameRecord(this, 'CertCnameRec', {
      zone: myHostedZone,
      recordName: domainName,
      domainName: certificate.certificateArn,
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
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
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
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.HTTPS, 'allow https traffic from internet')

    const ec2Sg = new ec2.SecurityGroup(this, 'Ec2Sg', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for ec2'
    })
    ec2Sg.connections.allowFrom(albSg, ec2.Port.HTTP, 'allow http traffic from alb')

    const rdsSg = new ec2.SecurityGroup(this, 'RdsSg', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for rds'
    })
    rdsSg.connections.allowFrom(ec2Sg, ec2.Port.tcp(3306), 'allow tcp traffic from ec2')

    // Create ec2
    const userData = ec2.UserData.forLinux({
      shebang: '#!/bin/bash',
    })
    userData.addCommands(
      // setup httpd
      'yum update -y',
      'yum install -y httpd',
      'systemctl start httpd',
      'systemctl enable httpd',
      'echo "This is a sample website." > /var/www/html/index.html',

      // Postgresql client
      'sudo dnf install -y postgresql15',
    )

    const ec2Ins = new ec2.Instance(this, 'Ec2', {
      instanceName: 'ec2',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
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
      userData,
      ssmSessionPermissions: true,
      propagateTagsToVolumeOnCreation: true,
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

    // Create WAF
    const webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WebACL',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // Associate WAF with ALB
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: alb.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

    // Create alias record
    const albAliasRecord = new route53.ARecord(this, 'AlbAliasRecord', {
      zone: myHostedZone,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
    });
    
    // Output alb test command
    new cdk.CfnOutput(this, 'AlbTestCommand', {
      value: `curl -I https://${albAliasRecord.domainName}`
    })

    // Create rds Postgresql instance
    const engine = rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_6 });
    const paramGrp = new rds.ParameterGroup(this, 'ExampleParamGrp', {
      engine,
      description: 'for Example'
    })
    const optGrp = new rds.OptionGroup(this, 'ExampleOptGrp', {
      engine,
      configurations: [],
      description: 'for Example'
    })

    const databaseName = 'example'
    const dbInstance = new rds.DatabaseInstance(this, 'ExampleDbInstance', {
      engine,
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [rdsSg],
      databaseName,
      parameterGroup: paramGrp,
      optionGroup: optGrp,
      multiAz: false,
      deleteAutomatedBackups: true,
      // Note: to avoid OptionGroup deletion error, do not leave any snapshots
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new cdk.CfnOutput(this, 'RdsConnectionCommand', {
      value: `psql -h ${dbInstance.instanceEndpoint.hostname} -d ${databaseName} -p ${dbInstance.dbInstanceEndpointPort} -U admin`
    });

    new cdk.CfnOutput(this, 'RdsConnectionString', {
      value: `host=${dbInstance.instanceEndpoint.hostname} port=${dbInstance.dbInstanceEndpointPort} dbname=${databaseName} user=admin password=<replace with your password>`
    });
  }
}
