# ADR-0003: Canonical Live Motion Photo Lifecycle

## Status

Accepted

## Context

Media Delivery needs to know whether a still image has a playable motion segment and how to locate it. Existing paths disagree: scan and resumable upload use `none`, `embedded`, and `paired`, while direct upload can store `google`.

`google` identifies an originating ecosystem. It does not express the delivery behavior needed to stream the motion segment.

## Decision

The canonical Live/Motion Photo Lifecycle is:

- `none`: no playable motion segment.
- `embedded`: the motion segment is contained in the still-image bytes.
- `paired`: the motion segment is a separate file referenced by the still image.

New and migrated indexing behavior must map old `google` values to `embedded` when an embedded segment is detected, otherwise to `none`.

## Consequences

- Media Delivery has one lifecycle vocabulary for all upload and scan paths.
- Origin ecosystem may be recorded separately later if it becomes a product requirement.
- Migration and fixture tests must cover legacy `google` records.
