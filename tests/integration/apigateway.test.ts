import {
  APIGatewayClient,
  CreateRestApiCommand,
  GetRestApisCommand,
} from '@aws-sdk/client-api-gateway';
import { FlociContainer, StartedFlociContainer } from '../../src';

describe('API Gateway (integration)', () => {
  let floci: StartedFlociContainer;
  let apigw: APIGatewayClient;

  beforeAll(async () => {
    floci = await new FlociContainer().start();
    apigw = new APIGatewayClient({
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

  it('creates and lists a REST API', async () => {
    const apiName = `test-api-${Date.now()}`;
    const { id } = await apigw.send(
      new CreateRestApiCommand({ name: apiName }),
    );
    expect(id).toBeDefined();

    const { items } = await apigw.send(new GetRestApisCommand({}));
    const names = (items ?? []).map((api) => api.name);
    expect(names).toContain(apiName);
  });
});
