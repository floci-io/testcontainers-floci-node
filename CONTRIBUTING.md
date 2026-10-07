# Contributing to Testcontainers Floci (Node.js)

Thank you for your interest in contributing! This document explains how to get started, how to run the tests, how the
branching model works, and what conventions to follow.

Please read and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

**Join us on [Slack](https://join.slack.com/t/floci/shared_invite/zt-3tjn02s3q-A00kEjJ1cZxsg_imTfy6Cw)**: it is the fastest way to reach maintainers.

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

All pull requests target `main`. Releases are cut from `main` by semantic-release; there are no
release branches.

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
   - If the service exposes extra ports, call `updatePortConfig('<service>', config)` from `withXConfig()` and verify
     `applyExposedPortsTo()` publishes ports only when enabled. Default containers publish only port 4566.
5. Add a unit test in `tests/unit/FlociContainer.test.ts` verifying config storage and chaining.
6. Add an integration test in `tests/integration/<service>.test.ts` using the corresponding AWS SDK v3 client.
7. Update the README config table.

## Developer Certificate of Origin (DCO) sign-off

Every commit must be **signed off**, certifying the
[Developer Certificate of Origin](https://developercertificate.org/), a lightweight statement
that you wrote the contribution or otherwise have the right to submit it under the project's
license. This keeps Floci's licensing clean and unambiguous, and it is **required for a pull
request to be merged**.

Sign off by adding the `-s` flag when you commit:

```bash
git commit -s -m "feat(s3): add multipart upload copy-part support"
```

This appends a `Signed-off-by: Your Name <your@email>` trailer using your configured git
identity. If you forget, you can amend the most recent commit with `git commit --amend -s`, or
sign off a range during an interactive rebase.

### Why the DCO and not a CLA

Floci is built by the community, for the community, and the DCO is how it stays that way. There
is no agreement to sign and no rights to hand over. You certify that the work is yours to give,
you keep the copyright in it, and it reaches everyone else on the same MIT terms it arrived
under.

A CLA would ask every contributor to grant something extra to whoever holds the project. Floci
does not ask for that. The Lead Maintainer signs off the same way a first-time contributor
does, and holds no rights over your work that you do not hold over theirs. Code released under
MIT stays under MIT: free to use, fork, and build on, for anyone, permanently.

Changes to this policy are reserved to the Lead Maintainer under
[GOVERNANCE.md](https://github.com/floci-io/.github/blob/main/GOVERNANCE.md).

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

**No AI attribution.** Do not add "Generated by", "Co-Authored-By: …-bot", or similar trailers to commit messages. Attribution should be limited to human contributors.

## Code Style

- Strict TypeScript (`strict: true`)
- Fluent API — `withX()` methods always return `this`
- Use `readonly` for immutable fields
- Barrel exports — consumers import from `@floci/testcontainers`
- No runtime dependencies beyond `testcontainers`
- Follow existing patterns before introducing new ones

## Pull Request Limits and Review Bandwidth

To make sure every contribution gets a thorough, high-quality review in a reasonable time, we ask contributors to keep **no more than 4 open pull requests**, drafts included, at any time in this repository, and **no more than 2 of them ready for review**.

- **Why this policy exists:** maintainer review time is limited. Capping concurrent open PRs prevents review backlogs, reduces context switching, and keeps PR cycle times short for everyone.
- **Dependent work:** if your work depends on a PR that has not been merged yet, build on that branch or note the dependency in the discussion instead of opening separate, uncoordinated PRs.
- **Draft PRs:** drafts do not count against the limit of 2 ready pull requests, but they do count toward the total of 4. You can have, for example, 2 ready and 2 drafts, or 1 ready and 3 drafts. Use drafts for work in progress, not as a queue of finished changes waiting for a review slot, and mark a draft as ready for review only when you have review capacity available.
- **How it is applied:** a bot turns a pull request back into a draft if it would be your 3rd ready for review, and closes a pull request opened while you already have 4 open, drafts included. Your branch and commits are always kept: mark the draft ready again once one of your ready pull requests is merged, closed or turned into a draft, and reopen a closed pull request once you have fewer than 4 open. Maintainers and dependency bots are not counted.

Once your current pull requests are reviewed, merged, or closed, you are welcome to open new ones!

## Releases

Releases are automatic. When a PR merges to `main` and touches `src/`, `tests/`, `package.json`,
`.releaserc.json` or the workflow, the `Semantic Release` workflow:

1. Calculates the next version from the Conventional Commits since the last `X.Y.Z` tag: `fix:` and
   `perf:` give a patch release, `feat:` a minor release, and `docs:`, `chore:`, `ci:` and `test:` none.
2. Updates `package.json`, generates `CHANGELOG.md`, commits them to `main`, tags the commit, and
   creates a GitHub Release.
3. The release triggers `publish.yml`, which publishes `@floci/testcontainers` to npm with provenance
   (trusted publishing, no token).

The package is in 0.x; a breaking change (`feat!:` or a `BREAKING CHANGE:` footer) moves it to 1.0.0.

Contributors do not need to manage versions or tags.

## Reporting Security Issues

Please do **not** open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them privately.
