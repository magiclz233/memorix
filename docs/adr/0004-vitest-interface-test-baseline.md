# ADR-0004: Establish a Vitest Interface-Test Baseline

## Status

Accepted

## Context

The repository has no configured test runner or executable test scripts. The CI workflow calls nonexistent unit and integration test commands while allowing them to fail.

The media safety and architecture work needs repeatable verification at the Media Delivery, Storage Object Access, and Media Ingestion interfaces.

## Decision

Adopt Vitest for server-side and pure-logic interface tests. CI must run only defined test commands and must fail when those tests fail.

The initial test surface covers Private Media cache policy, storage path validation, Live/Motion Photo lifecycle normalization, and Media Indexing idempotency. Browser end-to-end testing is not part of this phase.

## Consequences

- The first security patch has an executable regression test.
- New deep modules can be verified at their interfaces rather than through private implementation tests.
- CI becomes a release gate for the test surface it advertises.
