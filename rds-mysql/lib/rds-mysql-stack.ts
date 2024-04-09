import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class RdsMysqlStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // vpc
    const vpc = new ec2.Vpc(this, 'DbVpc', {
      vpcName: 'db-vpc',
      ipAddresses: ec2.IpAddresses.cidr('172.16.0.0/16'),
      natGateways: 1,
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

    //
    // rds
    //
    const engine = rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_34 });
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
      databaseName,
      parameterGroup: paramGrp,
      optionGroup: optGrp,
      multiAz: false,
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY    // to avoid OptionGroup deletion error, do not leave any snapshots
    });

    new CfnOutput(this, 'RdsConnectionCommand', {
      value: `mysql -h ${dbInstance.instanceEndpoint.hostname} -D ${databaseName} -P ${dbInstance.dbInstanceEndpointPort} -u admin -p`
    });

    new CfnOutput(this, 'RdsConnectionString', {
      value: `server=${dbInstance.instanceEndpoint.hostname};Port=${dbInstance.dbInstanceEndpointPort};database=${databaseName};user=admin;password=<replace with your password>`
    });
  }
}
