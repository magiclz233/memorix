# Memorix Context

## Ubiquitous Language

### Media
A user-managed asset represented in the gallery. A Media item may be an image, video, or animated image and belongs to one Storage Source.

### Storage Source
A configured location that owns Media bytes. Memorix supports local storage, NAS, and S3-compatible object storage.

### Public Media
Media that may be delivered to an unauthenticated viewer.

### Private Media
Media that is not published. It may only be delivered to its owner after authorization and must not be shared through public caches.

### Media Delivery
The act of resolving a Media item and delivering one of its representations: original bytes, a thumbnail, or a playable video stream.

### Media Ingestion
The act of accepting bytes from a storage scan or upload and creating the corresponding Media record.

### Media Indexing
The enrichment of an ingested Media item with its media classification, metadata, preview, BlurHash, and Live/Motion Photo lifecycle.

### Storage Object Access
The provider-neutral capability to enumerate, inspect, read, or range-read the bytes belonging to a Media item from its Storage Source.

### Live/Motion Photo Lifecycle
The way a still image exposes an associated playable motion segment. `none` has no segment, `embedded` stores the segment inside the image bytes, and `paired` references a separate motion file.

### Media Representation
A deliverable form of a Media item: original, thumbnail, or video stream. Authorization and cache visibility apply to every representation.
