Guidance for AI coding agents working in the testcontainers-floci-node repository.

This file defines repository-specific operating rules for autonomous or semi-autonomous coding agents. Follow these instructions unless a maintainer explicitly tells you otherwise.

---

## Project Overview

`@floci/testcontainers` is a Node.js Testcontainers module for Floci — the open-source local AWS emulator.

It provides a typed, fluent API for spinning up a Floci container in integration tests, with per-service configuration support for all 41 emulated AWS services.

- Package: `@floci/testcontainers`
- Stack:
  - TypeScript 5
  - Node.js 18+
  - Testcontainers for Node.js (^10.0.0)
  - Jest 29 (ts-jest)
  - AWS SDK v3 (dev dependency for integration tests)
- Docker image: `floci/floci:latest` (port 4566)

---

## First Principles

When making changes, follow these priorities:

1. Preserve the fluent builder API pattern
2. Keep parity with Floci's configuration surface
3. Maintain type safety — all config classes must be strongly typed
4. Keep the module lightweight — no runtime dependencies beyond `testcontainers`
5. Ensure tests validate real AWS SDK behavior against the container

Critical rules:

- Do not add runtime dependencies beyond `testcontainers`
- Do not break the fluent chaining API (`withX()` methods must return `this`)
- Do not expose internal container details through the public API
- Keep `StartedFlociContainer` focused on connection details consumers need

---

## Architecture

The module follows a simple layered design:

- **FlociContainer** — Builder class that configures and starts the container
- **StartedFlociContainer** — Wrapper around a running container exposing connection details
- **Config classes** — Per-service typed configuration (one class per AWS service)

### Key Files

| File | Purpose |
|------|---------|
| `src/core/CloudDescriptor.ts` | `CloudDescriptor`: one emulator's facts as data (image, port, env prefix, health/reset paths, socket services) |
| `src/core/FlociBaseContainer.ts` | Cloud-independent container and started container: env/ports, readiness, socket detection, network, namespace, log level, reset |
| `src/aws/FlociContainer.ts` | The `AWS` descriptor, `FlociContainer` and `StartedFlociContainer` built on the core |
| `src/aws/config/services.ts` | All AWS service config classes |
| `src/aws/config/index.ts` | AWS config barrel exports |
| `src/az/FlociAzContainer.ts` | The `AZ` descriptor, `FlociAzContainer` and `StartedFlociAzContainer` (Azure, `floci/floci-az`) |
| `src/az/config/services.ts` | All Azure service config classes (`enabled`, plus `mocked` where the emulator has it) |
| `src/az/config/TlsConfig.ts` | Azure TLS config (`httpsPort` defaults to `0`) |
| `src/az/index.ts` | Azure barrel; `src/index.ts` exports the two container classes and `AZ` by name and everything as the `az` namespace |
| `src/gcp/FlociGcpContainer.ts` | The `GCP` descriptor, `FlociGcpContainer` and `StartedFlociGcpContainer` (GCP, `floci/floci-gcp`) |
| `src/gcp/config/services.ts`, `TlsConfig.ts`, `src/gcp/index.ts` | GCP service configs (`enabled`, plus `mock` where the emulator has it), TLS config and barrel; exported like Azure, as the `gcp` namespace |
| `src/oci/FlociOciContainer.ts` | The `OCI` descriptor, `FlociOciContainer` and `StartedFlociOciContainer` (OCI, `floci/floci-oci`) |
| `src/oci/config/services.ts`, `TlsConfig.ts`, `src/oci/index.ts` | OCI service configs, TLS config and barrel; exported as the `oci` namespace |
| `src/index.ts` | Public API barrel exports |
| `src/FlociContainer.ts`, `src/config/*` | Aliases of the `src/aws/` files for old deep imports; keep them re-exporting, never put code there |

### Config Class Pattern

Every service config class implements `ServiceConfig`:

```ts
interface ServiceConfig {
  applyEnvVarsTo(container: FlociContainerTarget): void;
  applyExposedPortsTo(container: FlociContainerTarget): void;
}
```

Config classes translate typed parameters into `FLOCI_*` environment variables.

### Readiness

`FlociBaseContainer.readinessWait()` waits for the descriptor's health path over plain HTTP and, when
`<envPrefix>TLS_ENABLED` is `true` in the final environment (`tlsEnabled()`), over HTTPS on the same port too, with
the certificate unchecked. All the emulators accept connections on the shared port a few hundred milliseconds before
the HTTPS backend listens, so without the second probe the first TLS handshake after `start()` can be reset. It is
decided from the env, not from a `TlsConfig`, so it covers every cloud and raw `withEnv` settings.

### Azure (`src/az`)

- Still one npm package: Azure is exported from `src/index.ts`. Config classes are reached as `az.BlobConfig`
  because names such as `TlsConfig` and `AppConfigConfig` also exist for AWS.
- The mock switch is `FLOCI_AZ_SERVICES_<SERVICE>_MOCKED` (AWS uses `_MOCK`); the descriptor's `mockSetting` says so.
- Azure configs follow the family rule: `_ENABLED` always, every other key only while enabled. Each extends
  `AzServiceConfig` (or `AzMockableServiceConfig`) and overrides `requiresDockerSocket()` like the Java config.
- Configs are applied with the core's `replaceConfigEnv(previous, next)`: a key only the previous config wrote is
  dropped, or reset to the descriptor's `defaultEnv` value when it has one (`FLOCI_AZ_TLS_HTTPS_PORT=0`), and a
  value the caller changed with `withEnv` is never touched.
- The socket table in the `AZ` descriptor must agree with the configs; `tests/unit/az.test.ts` checks it.
  `mockedByDefault` marks services the emulator mocks unless told otherwise; `spawnsContainers` holds a
  mode-dependent rule (Cosmos engines, SQL data plane provider).
- Deliberate divergences from Java's `testcontainers-floci-az`: `TlsConfig.httpsPort` defaults to `0` (the family
  spec, section 3.5; Java still has 443), there is a `PolicyConfig` (the emulator has the service, Java does not yet),
  and there is no `AuthConfig` yet.
- The service list comes from `ServicesConfig` in `floci-az`'s `EmulatorConfig.java`. Adding a service: a class in
  `src/az/config/services.ts`, the barrel, a default plus `with…Config`/`get…Config` in `FlociAzContainer`, the
  `SERVICES` table in the unit test, and the socket table if it spawns containers.

### GCP (`src/gcp`)

- Same shape and scope as Azure. There is no Java module to port from yet, so the emulator is the source of truth:
  `ServicesConfig` in `floci-gcp`'s `EmulatorConfig.java` for the service list and its docs for the SDK variables.
  The pinned release is the reference, not the emulator repo's working branch.
- Service tokens have no underscores (`SECRETMANAGER`, `CLOUDSQL`); the mock switch is `_MOCK`, as on AWS.
- Socket services: GKE, Kafka, Cloud SQL, Cloud Run and BigQuery (not when `BIGQUERY_DUCK_URL` points at a running
  sidecar). Cloud Functions is control plane only and needs no socket.
- `FLOCI_GCP_SERVICES_GKE_ENDPOINT_MODE` is left at the emulator's default, `host`, which advertises
  `localhost:<published port>`; `network` advertises the sibling's container name, which the test host cannot resolve.
- `getEmulatorEnv()` values are `host:port`, except `STORAGE_EMULATOR_HOST`, which the SDKs want as a URL.
  `LOGGING_EMULATOR_HOST` and `KMS_EMULATOR_HOST` are read by no client library; they are kept for parity with the
  other languages and the emulator's compatibility tests.
- The integration test uses the Google SDKs (dev dependencies) through `getEmulatorEnv()`.

### OCI (`src/oci`)

- Same shape and scope as Azure and GCP, and like GCP ported from the emulator (`floci-oci`'s `EmulatorConfig.java`
  and docs at the pinned release), not from a Java module.
- Socket services: Functions and OKE, both with a `_MOCK` switch.
- Credentials: `getPrivateKeyPem()` generates a 2048-bit RSA key (PKCS#1 PEM, Node's `crypto`) once per started
  container, on first use, unless `withPrivateKeyPem()` supplied one. The user OCID and fingerprint are the placeholders from the emulator's docs; the emulator
  parses the signature's `keyId` for the tenancy and never verifies the signature. Never add a real key or a
  dependency for this.
- `getConfigFileContents(keyFile, profile)` returns the text only; the caller writes the files. An OCI config file
  cannot carry an endpoint.
- Do not set `FLOCI_OCI_AUTH_REQUIRE_SIGNATURE=true`: in floci-oci 0.4.2 it also answers 401 on `/health`,
  `/_floci-oci/health` and `/_floci-oci/state/reset` (its exemption compares the path without the leading slash), so
  the container never becomes ready and `reset()` fails. The integration test proves the signature is well formed
  through tenancy isolation instead, and records the bug as an `it.failing` test.
- The emulator has no endpoint that serves its TLS certificate, so there is no `getTlsCertificate()` here. TLS
  itself works at 0.4.2 (`tests/integration/oci-tls.test.ts`); the certificate is self-signed, at
  `/app/data/tls/floci-selfsigned.crt` in the container.
- The integration test uses `oci-common` and `oci-objectstorage` (dev dependencies), through both the config file
  and the in-memory provider.

---

## Package Layout

```
src/
  FlociContainer.ts       # Main container + started container
  index.ts                # Public exports
  config/
    index.ts              # Config barrel
    services.ts           # All service config classes
tests/
  unit/
    FlociContainer.test.ts
  integration/
    s3.test.ts
    sqs.test.ts
    dynamodb.test.ts
```

---

## Build & Run

```sh
npm ci                    # Install dependencies
npm run build             # Compile TypeScript
npm run typecheck         # Type-check without emitting
npm run test              # Run all tests
npm run test:unit         # Unit tests only (no Docker needed)
npm run test:integration  # Integration tests (requires Docker)
```

Integration tests require `NODE_OPTIONS=--experimental-vm-modules` (already configured in the `test:integration` script).

---

## Testing Rules

### Conventions

- Unit tests: `tests/unit/*.test.ts` — test builder logic, config wiring, no Docker
- Integration tests: `tests/integration/*.test.ts` — spin up a real Floci container, use AWS SDK clients

### Expectations

- Unit tests must not require Docker
- Integration tests must use real AWS SDK v3 clients against the container
- Each integration test file should focus on one AWS service
- Use `beforeAll` / `afterAll` to manage container lifecycle (one container per test file)
- Always call `floci.stop()` in `afterAll`

### When adding a new service config

1. Add the config class to `src/aws/config/services.ts`
2. Export it from `src/aws/config/index.ts`
3. Export it from `src/index.ts`
4. Add `withXConfig()` and `getXConfig()` methods to `FlociContainer`
5. Add the config to `applyAllConfigs()` in `FlociContainer`
6. If the service uses extra ports, call `updatePortConfig('<service>', config)` from its `withXConfig()` method
   and guard `applyExposedPortsTo()` when the service is disabled. Only explicitly supplied service configs publish extra ports.
7. If the service spawns sibling containers, add it to `socketServices` in the `AWS` descriptor
   (`mockable: true` if the Java config's `requiresDockerSocket()` checks `!mock`)
8. Add unit tests for the config wiring
9. Add an integration test using the corresponding AWS SDK client

---

## Environment Variable Mapping

Config classes map to Floci environment variables following the pattern:

```
FLOCI_SERVICES_<SERVICE>_<PROPERTY>
```

Examples:
- `FLOCI_SERVICES_S3_ENABLED`
- `FLOCI_SERVICES_LAMBDA_DEFAULT_MEMORY_MB`
- `FLOCI_SERVICES_RDS_PROXY_BASE_PORT`

Always use the `withEnv()` method on the container target — never set env vars directly on the underlying `GenericContainer`.

---

## Code Style

- Use strict TypeScript (`strict: true`)
- Prefer `this` return type for fluent methods
- Use `readonly` for immutable fields
- Keep config class constructors positional (matching Floci's config structure)
- Use barrel exports — consumers should import from `@floci/testcontainers`
- Follow existing patterns before introducing new ones

---

## Pull Request Guidelines

- Keep changes focused
- Avoid unrelated refactors
- Update README when adding new config classes or public API
- Ensure both unit and integration tests pass

Conventional commits:

- `feat:` — new service config, new API method
- `fix:` — bug fixes
- `docs:` — documentation only
- `chore:` — tooling, CI, dependencies

Do not add `Co-Authored-By` trailers for AI tools in commit messages.

---

## Release Awareness

- Releases follow the Java module's release-please flow (`.github/workflows/release-please.yml`): every
  push to `main` updates one release PR; nothing is published until a maintainer merges it, which tags
  `vX.Y.Z`, creates the GitHub release and publishes to npm via OIDC.
- Commit types therefore decide what the release PR proposes: `feat:` a minor, `fix:`/`perf:` a patch,
  other types none; mark breaking changes (`feat!:` / `BREAKING CHANGE:`), which move 0.x to 1.0.0.
- release-please owns `package.json`'s version, `package-lock.json`'s version, `CHANGELOG.md` and the
  tags. Never bump the version, edit `CHANGELOG.md` or create tags by hand.

---

## Agent Workflow

### Before editing

1. Identify which layer the change affects (container, config, tests)
2. Check if a similar service config already exists to mirror
3. Verify the corresponding Floci env var names
4. Plan both unit and integration test coverage

### Before finishing

1. Run `npm run typecheck`
2. Run `npm run test:unit`
3. Run `npm run test:integration` if Docker is available
4. Verify exports are correct in barrel files
5. Update README if public API changed

---

## Common Mistakes

- Forgetting to export new config classes from barrel files
- Breaking fluent chaining by not returning `this`
- Adding runtime dependencies that bloat the package
- Testing only with raw HTTP instead of AWS SDK clients
- Forgetting to add the config to `applyAllConfigs()`
- Not registering explicit configs with `updatePortConfig()` for services that need extra ports
  (Lambda, RDS, ElastiCache, OpenSearch, ECR, EKS)

---

## Human Handoff

If behavior is unclear:

1. Check Floci's `application.yml` for the canonical env var names
2. Check the Java Testcontainers module for API parity
3. Check the Python Testcontainers module for API parity
4. Prefer consistency with the existing Node.js patterns in this repo

If a task would require breaking the public API, stop and surface the tradeoffs.
