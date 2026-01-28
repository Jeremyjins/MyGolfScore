import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock Web Crypto API for PBKDF2 testing
const mockCrypto = {
  getRandomValues: <T extends ArrayBufferView>(array: T): T => {
    const bytes = new Uint8Array(array.buffer);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    importKey: vi.fn().mockResolvedValue({ type: 'raw' }),
    deriveBits: vi.fn().mockImplementation(async () => {
      // Return a deterministic 256-bit hash for testing
      const hash = new ArrayBuffer(32);
      const view = new Uint8Array(hash);
      for (let i = 0; i < 32; i++) {
        view[i] = i;
      }
      return hash;
    }),
  },
};

// Set up global crypto if not available
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: mockCrypto,
    writable: true,
  });
}

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
