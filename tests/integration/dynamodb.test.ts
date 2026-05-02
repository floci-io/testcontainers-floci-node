import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('DynamoDB (integration)', () => {
  let floci: StartedFlociContainer;
  let ddb: DynamoDBClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    ddb = new DynamoDBClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
    });
  });

  afterAll(async () => {
    await floci.stop();
  });

  it('creates an ACTIVE table', async () => {
    const tableName = `users-${Date.now()}`;
    await ddb.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );

    const { Table } = await ddb.send(new DescribeTableCommand({ TableName: tableName }));
    expect(Table?.TableStatus).toBe('ACTIVE');
  });

  it('puts and gets an item', async () => {
    const tableName = `items-${Date.now()}`;
    await ddb.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );

    await ddb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: { id: { S: 'user-1' }, name: { S: 'Alice' } },
      }),
    );

    const { Item } = await ddb.send(
      new GetItemCommand({
        TableName: tableName,
        Key: { id: { S: 'user-1' } },
      }),
    );
    expect(Item?.name?.S).toBe('Alice');
  });
});
