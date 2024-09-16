import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, ProjectionType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';

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
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY, // default RemovalPolicy is RETAIN
    });

    // simple table with encryption using CMK
    const cmk = new Key(this, 'TableEncryptionKey', {
      description: 'CMK for DynamoDB table encryption',
      enableKeyRotation: true,
    });
    const encryptionTableWithCmk = new Table(this, 'items', {
      partitionKey: {
        name: 'itemId',
        type: AttributeType.STRING
      },
      tableName: 'encItems',
      readCapacity: 1,
      writeCapacity: 1,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: cmk,
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
      readCapacity: 1,
      writeCapacity: 1,
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
      },
      projectionType: ProjectionType.INCLUDE,
      nonKeyAttributes: ['count, price']
    });

  }
}