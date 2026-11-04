import {
  CloudFrontClient,
  CreateDistributionCommand,
  type DistributionConfig,
} from '@aws-sdk/client-cloudfront';
import { FlociContainer, StartedFlociContainer } from '../../src';
import { TEST_IMAGE } from './images';

// Floci emulates the legacy CloudFront API, which requires MinTTL + ForwardedValues rather than a
// CachePolicyId.
function distributionConfig(callerReference: string): DistributionConfig {
  return {
    CallerReference: callerReference,
    Comment: 'Test distribution',
    Enabled: true,
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: 'test-origin',
          DomainName: 'example.com',
          CustomOriginConfig: {
            HTTPPort: 80,
            HTTPSPort: 443,
            OriginProtocolPolicy: 'http-only',
          },
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: 'test-origin',
      ViewerProtocolPolicy: 'allow-all',
      MinTTL: 0,
      ForwardedValues: {
        QueryString: false,
        Cookies: { Forward: 'none' },
      },
      TrustedSigners: { Enabled: false, Quantity: 0 },
    },
  };
}

async function createdDomainName(region?: string): Promise<string | undefined> {
  const image = new FlociContainer(TEST_IMAGE);
  const floci: StartedFlociContainer = await (region ? image.withRegion(region) : image).start();
  try {
    const cloudFront = new CloudFrontClient({
      endpoint: floci.getEndpoint(),
      region: floci.getRegion(),
      credentials: {
        accessKeyId: floci.getAccessKey(),
        secretAccessKey: floci.getSecretKey(),
      },
    });
    const { Distribution } = await cloudFront.send(
      new CreateDistributionCommand({ DistributionConfig: distributionConfig('test-distribution-ref') }),
    );
    return Distribution?.DomainName;
  } finally {
    await floci.stop();
  }
}

describe('CloudFront (integration)', () => {
  it('assigns the commercial suffix by default', async () => {
    expect(await createdDomainName()).toMatch(/\.cloudfront\.net$/);
  });

  it('assigns the China suffix when the request is signed for a China region', async () => {
    expect(await createdDomainName('cn-north-1')).toMatch(/\.cloudfront\.cn$/);
  });
});
