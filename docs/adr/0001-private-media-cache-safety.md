# ADR-0001: Private Media Uses a Private Cache Policy

## Status

Accepted

## Context

Memorix delivers originals, thumbnails, and video streams for both Public Media and Private Media. The existing media routes authorize Private Media requests but then return public, immutable cache headers. Shared caches may therefore reuse a Private Media response outside the authorized request context.

## Decision

Private Media representations must return `Cache-Control: private, no-store`. Public Media may continue to use long-lived public immutable caching. The policy applies consistently to original bytes, thumbnails, and video streams.

The cache policy is an explicit responsibility of Media Delivery and must be exercised by its interface tests.

## Consequences

- Private Media no longer depends on shared-cache behavior for performance.
- All Media Delivery routes must determine visibility before setting response headers.
- Public Media keeps its existing cacheability as a separate behavior.
