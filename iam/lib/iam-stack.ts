import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class IamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // group
    const ec2Policy = new iam.Policy(this, 'Ec2Policy', {
      document: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['ec2:Describe*'],
            resources: ['*'],
          }),
        ],
      }),
    });

    const rdsPolicy = new iam.Policy(this, 'RdsPolicy', {
      document: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['rds:Describe*'],
            resources: ['*'],
          }),
        ],
      }),
    });

    const group = new iam.Group(this, 'Group', {
      groupName: 'MyGroup',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess'),
      ],
    });
    group.attachInlinePolicy(ec2Policy);
    group.attachInlinePolicy(rdsPolicy);

    // user
    const user1 = new iam.User(this, 'User', {
      userName: 'MyUser1',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess'),
      ],
    });
    user1.addToGroup(group);
    user1.attachInlinePolicy(ec2Policy);
    user1.attachInlinePolicy(rdsPolicy);

    const user2 = new iam.User(this, 'User2', {
      userName: 'MyUser2',
    });
    user2.addToGroup(group);

    // role
    const role = new iam.Role(this, 'Role', {
      roleName: 'MyRole',
      assumedBy: new iam.AccountRootPrincipal(),
    });
    role.attachInlinePolicy(ec2Policy);
    role.attachInlinePolicy(rdsPolicy);
  }
}
