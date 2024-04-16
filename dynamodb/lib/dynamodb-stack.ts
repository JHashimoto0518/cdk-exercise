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

    // table with secondary indexes
    const tableWithIndexes = new Table(this, 'indexedItems', {
      partitionKey: {
        name: 'itemId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'count',
        type: AttributeType.NUMBER
      },
      tableName: 'indexedItems',
      removalPolicy: RemovalPolicy.DESTROY, // default RemovalPolicy is RETAIN
    });

    tableWithIndexes.addLocalSecondaryIndex({
      indexName: 'priceIndex',
      sortKey: {
        name: 'price',
        type: AttributeType.NUMBER
      }
    });

    tableWithIndexes.addGlobalSecondaryIndex({
      indexName: 'nameIndex',
      partitionKey: {
        name: 'name',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'itemId',
        type: AttributeType.STRING
      }
    });
  }
}