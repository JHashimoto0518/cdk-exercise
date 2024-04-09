import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';

export class DynamodbStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // simple table
    const table = new Table(this, 'items', {
      partitionKey: {
        name: 'itemId',
        type: AttributeType.STRING
      },
      tableName: 'items',
      removalPolicy: RemovalPolicy.DESTROY, // default RemovalPolicy is RETAIN
    });
  }
}
