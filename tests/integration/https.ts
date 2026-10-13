import https from 'https';

/**
 * One HTTPS GET on a fresh connection, with no retry: resolves with the status code, rejects on any
 * connection or TLS error. With `ca`, the server certificate must chain to it and match the host;
 * without, the certificate is not checked.
 */
export function httpsGetOnce(url: string, ca?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { agent: false, ca, rejectUnauthorized: ca !== undefined }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      })
      .on('error', reject);
  });
}
