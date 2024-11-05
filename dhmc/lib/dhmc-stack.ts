import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class DhmcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // リモートアクセスの許可IP
    const myIp = "<your global ip>"

    // EC2に設定するキーペア
    const myKeyName = "<your key pair>"

    // vpc
    const vpc = new ec2.Vpc(this, 'vpc', {
      vpcName: "test-vpc",
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

    //
    // Security Groups
    //
    const ec2Sg = new ec2.SecurityGroup(this, "sg-ec2", {
      vpc,
      allowAllOutbound: true,
      description: "security group for ec2"
    })
    // allow rdp
    ec2Sg.addIngressRule(ec2.Peer.ipv4(myIp), ec2.Port.tcp(3389), "allow rdp traffic from my ip")

    //
    // Roles
    //
    const s3Role = new iam.Role(this, 's3-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonS3FullAccess"
        ),
      ],
      description: 'role for ec2 using s3',
    });

    const ssmRole = new iam.Role(this, 'ssm-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
      description: 'role for managed by ssm',
    });

    //
    // linux server for dhmc
    //
    const linuxUserData = ec2.UserData.forLinux({
      shebang: "#!/bin/bash",
    })
    linuxUserData.addCommands(
      "yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm"  // update ssm-agent
    )

    const linux = new ec2.Instance(this, "ec2-linux", {
      instanceName: "test-ec2-linux-dhmc",
      instanceType: new ec2.InstanceType("t2.micro"),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      propagateTagsToVolumeOnCreation: true,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }),
      securityGroup: ec2Sg,
      role: s3Role,
      userData: linuxUserData,
    });

    //
    // Windows server for dhmc
    //
    const installerPath = "$env:USERPROFILE\\Desktop\\SSMAgent_latest.exe"
    const windowsUserData = ec2.UserData.forWindows()
    windowsUserData.addCommands(
      '$progressPreference = "silentlyContinue"',
      // インストーラダウンロード
      `Invoke-WebRequest https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/windows_amd64/AmazonSSMAgentSetup.exe -OutFile ${installerPath}`,
      // インストーラ実行 Note: 削除失敗を回避するため-waitをつける
      `Start-Process -FilePath ${installerPath} -ArgumentList "/S" -wait`,
      // インストーラ削除
      `rm -Force ${installerPath}`
    )

    const windows = new ec2.Instance(this, "ec2-windows", {
      instanceName: "test-ec2-windows-dhmc",
      instanceType: new ec2.InstanceType("t2.medium"),
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
      role: s3Role,
      userData: windowsUserData,
      keyName: myKeyName,
    });

    const windows2 = new ec2.Instance(this, "ec2-windows-2", {
      instanceName: "test-ec2-windows-dhmc2",
      instanceType: new ec2.InstanceType("t2.medium"),
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
      role: s3Role,
      userData: windowsUserData,
      keyName: myKeyName,
    });
  }
}