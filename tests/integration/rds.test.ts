import {
  RDSClient,
  CreateDBInstanceCommand,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds';
import { connect } from 'net';
import { FlociContainer, RdsConfig, StartedFlociContainer } from '../../src';
import { TEST_IMAGE } from './images';

describe('RDS (integration)', () => {
  let floci: StartedFlociContainer;
  let rds: RDSClient;

  beforeAll(async () => {
    floci = await new FlociContainer(TEST_IMAGE).start();
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

  // The endpoint is the Docker host and the published proxy port, so a host-side client can
  // connect on any OS (Floci otherwise advertises a bridge address only Linux can reach). The
  // proxy ports are published only when RDS is configured, so this test starts its own container.
  it('advertises an endpoint the host can connect to', async () => {
    const own = await new FlociContainer(TEST_IMAGE).withRdsConfig(new RdsConfig(true, 7010, 3)).start();
    try {
      const client = new RDSClient({
        endpoint: own.getEndpoint(),
        region: own.getRegion(),
        credentials: { accessKeyId: own.getAccessKey(), secretAccessKey: own.getSecretKey() },
      });
      const dbInstanceId = `endpoint-db-${Date.now()}`;
      await client.send(
        new CreateDBInstanceCommand({
          DBInstanceIdentifier: dbInstanceId,
          DBInstanceClass: 'db.t3.micro',
          Engine: 'postgres',
          MasterUsername: 'admin',
          MasterUserPassword: 'password123',
          AllocatedStorage: 20,
        }),
      );

      const deadline = Date.now() + 120_000;
      let endpoint: { Address?: string; Port?: number } | undefined;
      while (Date.now() < deadline) {
        const { DBInstances } = await client.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceId }));
        if (DBInstances?.[0]?.DBInstanceStatus === 'available' && DBInstances[0].Endpoint) {
          endpoint = DBInstances[0].Endpoint;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      expect(endpoint).toBeDefined();
      expect(endpoint!.Address).toBe(new URL(own.getEndpoint()).hostname);
      await new Promise<void>((resolve, reject) => {
        const socket = connect({ host: endpoint!.Address!, port: endpoint!.Port! }, () => {
          socket.end();
          resolve();
        });
        socket.setTimeout(5_000, () => {
        socket.destroy();
        reject(new Error('connect timed out'));
      });
        socket.on('error', reject);
      });
    } finally {
      await own.stop();
    }
  }, 300_000);
});
