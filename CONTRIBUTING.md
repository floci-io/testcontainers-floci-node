# Contributing to Testcontainers Floci (Node.js)

Thank you for your interest in contributing! This document explains how to get started, how to run the tests, how the
branching model works, and what conventions to follow.

Please read and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Docker (required for integration tests)

### Fork and clone

1. Fork the repository on GitHub.
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/testcontainers-floci-node.git
   cd testcontainers-floci-node
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/floci-io/testcontainers-floci-node.git
   ```

### Build

```bash
npm ci
npm run build
```

### Run tests

```bash
npm run test:unit          # Unit tests — no Docker required
npm run test:integration   # Integration tests — Docker must be running
```

Integration tests use `NODE_OPTIONS=--experimental-vm-modules` (configured in the npm script) because AWS SDK v3
requires it under Jest.

## Project Structure

```
src/
  FlociContainer.ts           Main container builder + StartedFlociContainer
  index.ts                    Public API barrel exports
  config/
    index.ts                  Config barrel exports
    services.ts               Per-service config classes (one per AWS service)

tests/
  unit/
    FlociContainer.test.ts    Unit tests for builder logic and config wiring (no Docker)
  integration/
    s3.test.ts                S3 integration test
    sqs.test.ts               SQS integration test
    dynamodb.test.ts          DynamoDB integration test
```

## Branching Model

| Branch        | Purpose                                              |
|---------------|------------------------------------------------------|
| `main`        | Active development; targets the latest version line  |
| `release/*`   | Stable release lines managed by semantic-release     |

**Where to target your pull request:**

- Bug fixes and new features → `main`
- Backports of critical fixes → the relevant `release/*` branch

When in doubt, open the PR against `main`.

## Making a Contribution

1. Sync with upstream before starting:
   ```bash
   git fetch upstream
   git checkout main
   git rebase upstream/main
   ```
2. Create a feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
3. Make your changes, add tests, and ensure the build passes:
   ```bash
   npm run typecheck
   npm run test:unit
   npm run test:integration
   ```
4. Commit following the [commit message conventions](#commit-messages) below.
5. Push and open a pull request against `main`.

### Adding support for a new Floci service

When Floci adds a new service, the typical steps are:

1. Add the config class to `src/config/services.ts` following the existing pattern:
   - Implement `ServiceConfig` interface (`applyEnvVarsTo`, `applyExposedPortsTo`)
   - Use constructor parameters matching Floci's config properties
   - Map to `FLOCI_SERVICES_<SERVICE>_<PROPERTY>` environment variables
2. Export the new class from `src/config/index.ts`.
3. Export the new class from `src/index.ts`.
4. Wire into `FlociContainer`:
   - Add a private field with default instance
   - Add `withXConfig(config)` method (must return `this`)
   - Add `getXConfig()` getter
   - Register in `applyAllConfigs()`
   - If the service exposes extra ports, add to `refreshExposedPorts()`
5. Add a unit test in `tests/unit/FlociContainer.test.ts` verifying config storage and chaining.
6. Add an integration test in `tests/integration/<service>.test.ts` using the corresponding AWS SDK v3 client.
7. Update the README config table.

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages directly determine
the release version that is published automatically.

### Format

```
<type>[optional scope]: <short description>

[optional body]

[optional footer(s)]
```

### Types and version impact

| Prefix                          | Version bump           | Example                                        |
|---------------------------------|------------------------|------------------------------------------------|
| `fix:`                          | Patch (0.1.0 → 0.1.1) | `fix: handle undefined region gracefully`      |
| `feat:`                         | Minor (0.1.0 → 0.2.0) | `feat: add StepFunctionsConfig`                |
| `feat!:` or `BREAKING CHANGE:`  | Major (0.1.0 → 1.0.0) | `feat!: drop Node.js 16 support`               |
| `chore:`, `docs:`, `ci:`        | No release             | `docs: update README examples`                 |

## Code Style

- Strict TypeScript (`strict: true`)
- Fluent API — `withX()` methods always return `this`
- Use `readonly` for immutable fields
- Barrel exports — consumers import from `@floci/testcontainers`
- No runtime dependencies beyond `testcontainers`
- Follow existing patterns before introducing new ones

## Releases

Releases are managed by the maintainers via semantic-release on `release/*` branches. The workflow:

1. Calculates the next version from conventional commit history.
2. Updates `package.json`, generates `CHANGELOG.md`, tags the commit, and creates a GitHub Release.
3. Publishes to npm as `@floci/testcontainers`.

Contributors do not need to manage versions or tags.
