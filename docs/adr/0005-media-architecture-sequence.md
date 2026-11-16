# ADR-0005: Sequence Media Architecture Improvements by Delivery

## Status

Accepted

## Context

Media Delivery duplicates authorization, cache policy, path validation, and Local/S3 provider behavior across original, thumbnail, and video routes. Storage Object Access is currently an unused abstraction. Media Ingestion and Indexing also has duplicated behavior across scans and upload paths.

## Decision

Implement the architecture work in this order:

1. Media Delivery.
2. Storage Object Access.
3. Media Ingestion and Indexing.
4. Legacy data/actions migration and cache consolidation.
5. Documentation alignment.

## Consequences

- The known Private Media security defect is corrected before broader refactoring.
- Storage Object Access is shaped by a real caller before ingestion adopts it.
- Media Ingestion can reuse established storage semantics instead of defining a competing provider seam.
- Legacy migration remains behavior-preserving cleanup after the critical paths are covered.
