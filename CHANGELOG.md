# Changelog

## [0.4.0](https://github.com/floci-io/testcontainers-floci-node/compare/v0.3.0...v0.4.0) (2026-10-15)


### Features

* **az:** add FlociAzContainer for the Floci Azure emulator ([#33](https://github.com/floci-io/testcontainers-floci-node/issues/33)) ([ed016cf](https://github.com/floci-io/testcontainers-floci-node/commit/ed016cf0eb506ef971379e3ba7b71481bf952f9e))
* **gcp:** add FlociGcpContainer for the Floci GCP emulator ([#35](https://github.com/floci-io/testcontainers-floci-node/issues/35)) ([613a399](https://github.com/floci-io/testcontainers-floci-node/commit/613a399d1ce480bab6bffec081075ab8922f35ac))
* **oci:** add FlociOciContainer for the Floci OCI emulator ([#36](https://github.com/floci-io/testcontainers-floci-node/issues/36)) ([259042b](https://github.com/floci-io/testcontainers-floci-node/commit/259042b7eb7b5a193b2975554da47ecdf808b100))

## [0.3.0](https://github.com/floci-io/testcontainers-floci-node/compare/0.2.0...v0.3.0) (2026-10-10)


### Features

* shared core with a cloud descriptor; AWS code moves to src/aws ([#21](https://github.com/floci-io/testcontainers-floci-node/issues/21)) ([625ec07](https://github.com/floci-io/testcontainers-floci-node/commit/625ec07d3770d42af3136028f7660d9c60ab26c8))


### Bug Fixes

* remove Floci's sibling containers on stop; advertise a reachable RDS endpoint ([#23](https://github.com/floci-io/testcontainers-floci-node/issues/23)) ([fa4beeb](https://github.com/floci-io/testcontainers-floci-node/commit/fa4beeb2c0f0cf25cbb4e36a776a926a3608647b))

## [0.2.0](https://github.com/floci-io/testcontainers-floci-node/compare/0.1.0...0.2.0) (2026-10-07)


### Bug Fixes

* increase floci container startup timeout ([#4](https://github.com/floci-io/testcontainers-floci-node/issues/4)) ([f984e10](https://github.com/floci-io/testcontainers-floci-node/commit/f984e1068233c205049fc34401fd167d46a17df5))


### Features

* add full feature parity with Java testcontainers-floci ([#6](https://github.com/floci-io/testcontainers-floci-node/issues/6)) ([ce2326d](https://github.com/floci-io/testcontainers-floci-node/commit/ce2326d27dcc4daad2f5cdc135a2e67e039e33eb))
* make Docker socket mount configurable ([#11](https://github.com/floci-io/testcontainers-floci-node/issues/11)) ([c0bd9bf](https://github.com/floci-io/testcontainers-floci-node/commit/c0bd9bffccd3515ecefd92b9f52a1551966a7a8b))
* publish service ports only when configured ([#12](https://github.com/floci-io/testcontainers-floci-node/issues/12)) ([d715a0a](https://github.com/floci-io/testcontainers-floci-node/commit/d715a0a14337a9e3c2708482171c1afb21644fb4))
