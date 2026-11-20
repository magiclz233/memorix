/**
 * 大文件 SHA-256 计算 Worker（增量式，内存恒定）。
 *
 * 旧实现把每个 chunk 存进数组再合并成一个整文件 Uint8Array，5GB 文件会在
 * worker 线程里分配 5GB 内存直接崩溃。这里改为边读边 update 的流式哈希，
 * 峰值内存只有一个 chunk（默认 4MB）。
 *
 * Web Crypto 的 crypto.subtle.digest 是"一次性"接口，不支持喂流，故内嵌一个
 * 经过验证的增量 SHA-256 实现（FIPS 180-4），输出与 subtle.digest 完全一致。
 */

// ---- 增量 SHA-256 实现 ----
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

class Sha256 {
  constructor() {
    this.state = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    this.buffer = new Uint8Array(64);
    this.bufferLength = 0;
    this.bytesHigh = 0;
    this.bytesLow = 0;
    this.finished = false;
    this._w = new Uint32Array(64);
  }

  update(data) {
    if (this.finished) throw new Error('SHA-256 already finalized');
    let offset = 0;
    const len = data.length;

    // 64-bit bit counter（用高低两个 32 位字表示）
    this.bytesLow = (this.bytesLow + len) >>> 0;
    if (this.bytesLow < len) this.bytesHigh = (this.bytesHigh + 1) >>> 0;

    while (offset < len) {
      const filled = this.bufferLength;
      const take = Math.min(64 - filled, len - offset);
      this.buffer.set(data.subarray(offset, offset + take), filled);
      this.bufferLength += take;
      offset += take;
      if (this.bufferLength === 64) {
        this._compress(this.buffer);
        this.bufferLength = 0;
      }
    }
    return this;
  }

  _compress(block) {
    const w = this._w;
    for (let i = 0; i < 16; i++) {
      const j = i * 4;
      w[i] = ((block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = this.state;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    this.state[0] = (this.state[0] + a) >>> 0;
    this.state[1] = (this.state[1] + b) >>> 0;
    this.state[2] = (this.state[2] + c) >>> 0;
    this.state[3] = (this.state[3] + d) >>> 0;
    this.state[4] = (this.state[4] + e) >>> 0;
    this.state[5] = (this.state[5] + f) >>> 0;
    this.state[6] = (this.state[6] + g) >>> 0;
    this.state[7] = (this.state[7] + h) >>> 0;
  }

  digest() {
    if (this.finished) return this._hex;
    const bitHigh = (this.bytesHigh << 3) | (this.bytesLow >>> 29);
    const bitLow = (this.bytesLow << 3) >>> 0;

    this.buffer[this.bufferLength++] = 0x80;
    if (this.bufferLength > 56) {
      this.buffer.fill(0, this.bufferLength);
      this._compress(this.buffer);
      this.bufferLength = 0;
    }
    this.buffer.fill(0, this.bufferLength, 56);
    const p = this.buffer;
    p[56] = (bitHigh >>> 24) & 0xff; p[57] = (bitHigh >>> 16) & 0xff;
    p[58] = (bitHigh >>> 8) & 0xff; p[59] = bitHigh & 0xff;
    p[60] = (bitLow >>> 24) & 0xff; p[61] = (bitLow >>> 16) & 0xff;
    p[62] = (bitLow >>> 8) & 0xff; p[63] = bitLow & 0xff;
    this._compress(p);

    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
      out[i * 4] = (this.state[i] >>> 24) & 0xff;
      out[i * 4 + 1] = (this.state[i] >>> 16) & 0xff;
      out[i * 4 + 2] = (this.state[i] >>> 8) & 0xff;
      out[i * 4 + 3] = this.state[i] & 0xff;
    }
    this.finished = true;
    this._hex = Array.from(out).map((b) => b.toString(16).padStart(2, '0')).join('');
    return this._hex;
  }
}

function rotr(x, n) {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

self.onmessage = async (event) => {
  const file = event.data?.file;
  const chunkSize = event.data?.chunkSize || 4 * 1024 * 1024;

  if (!(file instanceof File)) {
    self.postMessage({ type: 'error', error: 'Invalid file payload' });
    return;
  }

  try {
    const hasher = new Sha256();
    let loaded = 0;

    // 逐块读取并增量 update，峰值内存只有一个 chunk，不随文件大小增长。
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, file.size);
      const part = file.slice(offset, end);
      const buffer = await part.arrayBuffer();
      hasher.update(new Uint8Array(buffer));
      loaded += part.size;

      self.postMessage({
        type: 'progress',
        progress: Math.min(100, Math.round((loaded / file.size) * 100)),
      });
    }

    self.postMessage({ type: 'done', hash: hasher.digest() });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Hash worker failed',
    });
  }
};
