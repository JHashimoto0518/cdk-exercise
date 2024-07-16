import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export class MinimalEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCの作成
    const vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 2
    });

    // ECSクラスターの作成
    const cluster = new ecs.Cluster(this, 'MinimalCluster', {
      vpc: vpc,
      enableFargateCapacityProviders: true,
    });

    // Cloud Mapネームスペースの作成
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'Namespace', {
      name: 'minimal-service',
      vpc: vpc,
    });

    // タスク定義の作成
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // コンテナの追加
    taskDefinition.addContainer('WebContainer', {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      portMappings: [{ containerPort: 80 }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'MinimalService' }),
    });

    // ECSサービスの作成
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      cloudMapOptions: {
        name: 'web',
        cloudMapNamespace: namespace,
      },
    });

    // 出力
    new cdk.CfnOutput(this, 'ServiceName', { value: service.serviceName });
    new cdk.CfnOutput(this, 'ServiceArn', { value: service.serviceArn });
  }
}