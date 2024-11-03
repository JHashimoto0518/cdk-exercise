import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class WindowsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //
    // 環境依存の変数。適宜変更すること
    //
    const accountId = "332873834566";
    const region = "ap-northeast-1";
    // リモートアクセスの許可IP
    const myIp = "153.124.191.137/32"

    // EC2に設定するキーペア
    const myKeyName = "kpair-test"
    //
    // 環境依存の変数ここまで
    //

    // vpc
    const vpc = new ec2.Vpc(this, 'vpc', {
      vpcName: "sky-test-vpc",
      ipAddresses: ec2.IpAddresses.cidr('172.16.0.0/16'),
      natGateways: 1,
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
      ],
    });

    // add private endpoints for fleet manager/session manager
    vpc.addInterfaceEndpoint('SsmEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
    });
    vpc.addInterfaceEndpoint('SsmMessagesEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    });
    vpc.addInterfaceEndpoint('Ec2MessagesEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
    });

    //
    // Security Groups
    //
    const ec2Sg = new ec2.SecurityGroup(this, "sg-ec2", {
      vpc,
      allowAllOutbound: true,
      description: "security group for ec2"
    })

    //
    // Roles
    //
    // Note: EC2にアタッチするロール
    const managedBySsmRole = new iam.Role(this, 'ssm-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
      description: 'role for managed by ssm',
    });

    //
    // Policies
    //
    // Note: フリートマネージャーを利用するプリンシパルに対して、このポリシーをアタッチする
    const allowFleetManagerPolicy = new iam.ManagedPolicy(this, "allow-fleetmanager-policy", {
      managedPolicyName: "allow-fleetmanager-policy",
      statements: [
        new iam.PolicyStatement({
          sid: "AllowStartSession",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:StartSession",
          ],
          resources: [
            `arn:aws:ec2:${region}:${accountId}:instance/*`,
            "arn:aws:ssm:*:*:document/AWS-StartPortForwardingSession"
          ],
        }),
        // NOTE: https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/getting-started-restrict-access-examples.html#restrict-access-example-user-sessions
        new iam.PolicyStatement({
          sid: "AllowTerminateSession",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:TerminateSession",
            "ssm:ResumeSession",
          ],
          resources: [
            "arn:aws:ssm:*:*:session/${aws:username}-*" // 自身が開始したセッションのみ再開および停止可能
          ]
        }),
        // NOTE: https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/fleet-rdp.html の標準ポリシーより
        new iam.PolicyStatement({
          sid: "EC2",
          effect: iam.Effect.ALLOW,
          actions: [
            "ec2:DescribeInstances",
            "ec2:GetPasswordData",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          sid: "SSM",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:DescribeInstanceProperties",
            "ssm:GetCommandInvocation",
            "ssm:GetInventorySchema",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          sid: "GuiConnect",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm-guiconnect:CancelConnection",
            "ssm-guiconnect:GetConnection",
            "ssm-guiconnect:StartConnection",
          ],
          resources: ["*"],
        }),
      ],
    });

    // Note: セッションマネージャーを利用するプリンシパルに対して、このポリシーをアタッチする
    // 参考: https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html
    const allowSessionManagerPolicy = new iam.ManagedPolicy(this, "allow-session-manager-policy", {
      managedPolicyName: "allow-session-manager-policy",
      statements: [
        new iam.PolicyStatement({
          sid: "AllowStartSession",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:StartSession",
            "ssm:SendCommand"
          ],
          resources: [
            `arn:aws:ec2:${region}:${accountId}:instance/*`,
            //"arn:aws:ssm:*:*:document/AWS-StartPortForwardingSession",
            "arn:aws:ssm:region:account-id:document/SSM-SessionManagerRunShell"
          ],
        }),
        new iam.PolicyStatement({
          sid: "AllowDescribeSessions",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:DescribeSessions",
            "ssm:GetConnectionStatus",
            "ssm:DescribeInstanceInformation",
            "ssm:DescribeInstanceProperties",
            "ec2:DescribeInstances"
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          sid: "AllowTerminateOrResumeSession",
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:TerminateSession",
            "ssm:ResumeSession",
          ],
          resources: [
            "arn:aws:ssm:*:*:session/${aws:username}-*" // 自身が開始したセッションのみ再開および停止可能
          ]
        }),
      ]
    });

    //
    // 接続テスト用Windows server
    //
    const windows = new ec2.Instance(this, "ec2-windows", {
      instanceName: "sky-test-ec2-windows",
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M7I, ec2.InstanceSize.XLARGE),
      machineImage: ec2.MachineImage.latestWindows(
        ec2.WindowsVersion.WINDOWS_SERVER_2022_JAPANESE_FULL_BASE
      ),
      vpc,
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      propagateTagsToVolumeOnCreation: true,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }),
      securityGroup: ec2Sg,
      role: managedBySsmRole,
      keyName: myKeyName,
    });
  }
}