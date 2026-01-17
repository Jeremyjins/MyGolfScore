import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSession,
  requireAuth,
  createSessionCookie,
  deleteSessionCookie,
  hashPin,
  verifyPin,
} from '../auth.server';

// Helper to create a mock request with Cookie header
// happy-dom's Request strips Cookie headers (forbidden header name),
// so we need to create a minimal mock that allows it
function createMockRequest(cookieValue?: string): Request {
  const headers = new Map<string, string>();
  if (cookieValue) {
    headers.set('cookie', cookieValue);
  }

  return {
    headers: {
      get(name: string): string | null {
        return headers.get(name.toLowerCase()) ?? null;
      },
    },
    url: 'http://localhost/',
  } as unknown as Request;
}

describe('auth.server', () => {
  describe('Session Management', () => {
    describe('createSessionCookie', () => {
      it('should create a session cookie with correct format', () => {
        const cookie = createSessionCookie('user-123', 'Test User', false);

        expect(cookie).toContain('golf_session=');
        expect(cookie).toContain('Path=/');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Lax');
        expect(cookie).toContain('Max-Age=86400'); // 1 day
      });

      it('should create a longer session with rememberMe', () => {
        const cookie = createSessionCookie('user-123', 'Test User', true);

        expect(cookie).toContain('Max-Age=2592000'); // 30 days
      });

      it('should encode session data in base64', () => {
        const cookie = createSessionCookie('user-123', 'Test User', false);
        const cookieValue = cookie.split(';')[0].split('=')[1];

        // Should be valid base64
        expect(() => atob(cookieValue)).not.toThrow();

        // Should decode to valid JSON with session data
        const decoded = JSON.parse(atob(cookieValue));
        expect(decoded.userId).toBe('user-123');
        expect(decoded.userName).toBe('Test User');
        expect(decoded.expiresAt).toBeGreaterThan(Date.now());
      });
    });

    describe('deleteSessionCookie', () => {
      it('should create a delete cookie with Max-Age=0', () => {
        const cookie = deleteSessionCookie();

        expect(cookie).toContain('golf_session=');
        expect(cookie).toContain('Max-Age=0');
      });

      it('should have HttpOnly flag', () => {
        const cookie = deleteSessionCookie();
        expect(cookie).toContain('HttpOnly');
      });
    });

    describe('getSession', () => {
      it('should return null for request without cookie', () => {
        const request = createMockRequest();

        const session = getSession(request);
        expect(session).toBeNull();
      });

      it('should return null for invalid base64 cookie', () => {
        const request = createMockRequest('golf_session=!!!invalid!!!');

        const session = getSession(request);
        expect(session).toBeNull();
      });

      it('should return null for valid base64 but invalid JSON', () => {
        const request = createMockRequest(`golf_session=${btoa('not json')}`);

        const session = getSession(request);
        expect(session).toBeNull();
      });

      it('should return null for expired session', () => {
        const expiredSession = {
          userId: 'user-123',
          userName: 'Test User',
          expiresAt: Date.now() - 1000,
        };
        const encoded = btoa(JSON.stringify(expiredSession));

        const request = createMockRequest(`golf_session=${encoded}`);

        const session = getSession(request);
        expect(session).toBeNull();
      });

      it('should return session for valid cookie', () => {
        const validSession = {
          userId: 'user-123',
          userName: 'Test User',
          expiresAt: Date.now() + 86400000,
        };
        const encoded = btoa(JSON.stringify(validSession));

        const request = createMockRequest(`golf_session=${encoded}`);

        const session = getSession(request);
        expect(session).not.toBeNull();
        expect(session?.userId).toBe('user-123');
        expect(session?.userName).toBe('Test User');
      });

      it('should handle cookies with URL encoding', () => {
        const validSession = {
          userId: 'user-123',
          userName: 'Test User',
          expiresAt: Date.now() + 86400000,
        };
        const encoded = btoa(JSON.stringify(validSession));

        const request = createMockRequest(
          `golf_session=${encodeURIComponent(encoded)}`
        );

        const session = getSession(request);
        expect(session).not.toBeNull();
        expect(session?.userId).toBe('user-123');
      });
    });

    describe('requireAuth', () => {
      it('should throw redirect for unauthenticated request', () => {
        const request = createMockRequest();

        expect(() => requireAuth(request)).toThrow();
      });

      it('should return session for authenticated request', () => {
        const validSession = {
          userId: 'user-123',
          userName: 'Test User',
          expiresAt: Date.now() + 86400000,
        };
        const encoded = btoa(JSON.stringify(validSession));

        const request = createMockRequest(`golf_session=${encoded}`);

        const session = requireAuth(request);
        expect(session.userId).toBe('user-123');
        expect(session.userName).toBe('Test User');
      });

      it('should throw for expired session', () => {
        const expiredSession = {
          userId: 'user-123',
          userName: 'Test User',
          expiresAt: Date.now() - 1000,
        };
        const encoded = btoa(JSON.stringify(expiredSession));

        const request = createMockRequest(`golf_session=${encoded}`);

        expect(() => requireAuth(request)).toThrow();
      });
    });
  });

  describe('PIN Hashing', () => {
    describe('hashPin', () => {
      it('should generate hash in salt:hash format', async () => {
        const hash = await hashPin('1234');

        expect(hash).toContain(':');
        const parts = hash.split(':');
        expect(parts).toHaveLength(2);
        expect(parts[0].length).toBe(32); // 16 bytes = 32 hex chars
        expect(parts[1].length).toBe(64); // 32 bytes = 64 hex chars
      });

      it('should generate different hashes for same PIN (different salt)', async () => {
        const hash1 = await hashPin('1234');
        const hash2 = await hashPin('1234');

        const salt1 = hash1.split(':')[0];
        const salt2 = hash2.split(':')[0];
        expect(salt1).not.toBe(salt2);
      });

      it('should generate only hex characters', async () => {
        const hash = await hashPin('0000');
        const [salt, hashPart] = hash.split(':');

        expect(salt).toMatch(/^[0-9a-f]+$/);
        expect(hashPart).toMatch(/^[0-9a-f]+$/);
      });
    });

    describe('verifyPin', () => {
      it('should return false for invalid hash format', async () => {
        const result = await verifyPin('1234', 'invalid_hash');
        expect(result).toBe(false);
      });

      it('should return false for hash without separator', async () => {
        const result = await verifyPin('1234', 'nocolonhere');
        expect(result).toBe(false);
      });

      it('should return false for empty hash parts', async () => {
        const result = await verifyPin('1234', ':');
        expect(result).toBe(false);
      });

      it('should return false for malformed hex in hash', async () => {
        const result = await verifyPin('1234', 'zzzzzzzzzzzzzzzz:yyyyyyyyyyyyyyyy');
        expect(result).toBe(false);
      });
    });
  });
});
