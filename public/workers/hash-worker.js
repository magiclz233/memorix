self.onmessage = async (event) => {
  const file = event.data?.file;
  const chunkSize = event.data?.chunkSize || 2 * 1024 * 1024;

  if (!(file instanceof File)) {
    self.postMessage({ type: 'error', error: 'Invalid file payload' });
    return;
  }

  try {
    const chunks = [];
    let loaded = 0;

    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, file.size);
      const part = file.slice(offset, end);
      const buffer = await part.arrayBuffer();

      chunks.push(new Uint8Array(buffer));
      loaded += part.size;

      self.postMessage({
        type: 'progress',
        progress: Math.min(100, Math.round((loaded / file.size) * 100)),
      });
    }

    const merged = new Uint8Array(loaded);
    let cursor = 0;

    for (const part of chunks) {
      merged.set(part, cursor);
      cursor += part.length;
    }

    const digest = await crypto.subtle.digest('SHA-256', merged);
    const hash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    self.postMessage({ type: 'done', hash });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Hash worker failed',
    });
  }
};