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
| `src/FlociContainer.ts` | Main container builder and started container classes |
| `src/config/services.ts` | All service config classes |
| `src/config/index.ts` | Config barrel exports |
| `src/index.ts` | Public API barrel exports |

### Config Class Pattern

Every service config class implements `ServiceConfig`:

```ts
interface ServiceConfig {
  applyEnvVarsTo(container: FlociContainerTarget): void;
  applyExposedPortsTo(container: FlociContainerTarget): void;
}
```

Config classes translate typed parameters into `FLOCI_*` environment variables.

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

1. Add the config class to `src/config/services.ts`
2. Export it from `src/config/index.ts`
3. Export it from `src/index.ts`
4. Add `withXConfig()` and `getXConfig()` methods to `FlociContainer`
5. Add the config to `applyAllConfigs()` in `FlociContainer`
6. If the service uses extra ports, add it to `refreshExposedPorts()`
7. Add unit tests for the config wiring
8. Add an integration test using the corresponding AWS SDK client

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

- Releases use semantic-release on `release/*` branches
- Tags trigger the publish workflow
- `main` branch runs CI but does not auto-publish

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
- Not handling port exposure for services that need extra ports (Lambda, RDS, ElastiCache, OpenSearch, ECR, EKS)

---

## Human Handoff

If behavior is unclear:

1. Check Floci's `application.yml` for the canonical env var names
2. Check the Java Testcontainers module for API parity
3. Check the Python Testcontainers module for API parity
4. Prefer consistency with the existing Node.js patterns in this repo

If a task would require breaking the public API, stop and surface the tradeoffs.
