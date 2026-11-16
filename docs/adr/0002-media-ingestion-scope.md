# ADR-0002: Retain Both Upload Paths Behind Shared Media Ingestion

## Status

Accepted

## Context

Memorix has two upload paths with different storage coverage. Direct upload supports local, NAS, S3-compatible, and Qiniu storage. Resumable chunk upload currently supports local and NAS storage only.

Both paths and storage scans create Media records and trigger Media Indexing, but they currently use inconsistent indexing logic.

## Decision

Retain direct upload and resumable chunk upload. They will converge on shared Media Ingestion and Media Indexing behavior.

S3-compatible multipart/resumable upload is outside the current architecture improvement scope. It remains a future capability rather than an implicit requirement of the ingestion refactor.

## Consequences

- The shared ingestion interface must work for all existing Storage Sources.
- The resumable upload interface remains explicitly limited to local and NAS Storage Sources.
- The current work can remove indexing drift without introducing S3 multipart lifecycle, cleanup, and recovery behavior.
