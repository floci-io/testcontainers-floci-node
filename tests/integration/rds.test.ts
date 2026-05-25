import {
  RDSClient,
  CreateDBInstanceCommand,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('RDS (integration)', () => {
  let floci: StartedFlociContainer;
  let rds: RDSClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    rds = new RDSClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
    });
  });

  afterAll(async () => {
    if (floci) {
      await floci.stop();
    }
  });

  it('creates a DB instance and describes it', async () => {
    const dbInstanceId = `test-db-${Date.now()}`;
    await rds.send(
      new CreateDBInstanceCommand({
        DBInstanceIdentifier: dbInstanceId,
        DBInstanceClass: 'db.t3.micro',
        Engine: 'postgres',
        MasterUsername: 'admin',
        MasterUserPassword: 'password123',
        AllocatedStorage: 20,
      }),
    );

    const { DBInstances } = await rds.send(
      new DescribeDBInstancesCommand({
        DBInstanceIdentifier: dbInstanceId,
      }),
    );
    expect(DBInstances).toBeDefined();
    expect(DBInstances!.length).toBeGreaterThan(0);
    expect(DBInstances![0].DBInstanceIdentifier).toBe(dbInstanceId);
  });
});
