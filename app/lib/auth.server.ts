// Authentication utilities for server-side
import { redirect } from 'react-router';
import type { Session } from '~/types';

const SESSION_COOKIE_NAME = 'golf_session';

// ============================================
// Hex encoding utilities for PBKDF2 hashing
// ============================================
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// 쿠키 파싱
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce(
    (cookies, cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies[name] = decodeURIComponent(rest.join('='));
      }
      return cookies;
    },
    {} as Record<string, string>
  );
}

// 세션 데이터 인코딩 (UTF-8 지원)
function encodeSession(session: Session): string {
  const jsonString = JSON.stringify(session);
  // TextEncoder를 사용하여 UTF-8로 인코딩
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(jsonString);
  // Uint8Array를 Base64로 변환
  const binaryString = Array.from(uint8Array)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return btoa(binaryString);
}

// 세션 데이터 디코딩
function decodeSession(encoded: string): Session | null {
  try {
    // Base64를 Uint8Array로 변환
    const binaryString = atob(encoded);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    // UTF-8로 디코딩
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(uint8Array);
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

// 세션 쿠키에서 세션 가져오기
export function getSession(request: Request): Session | null {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const sessionCookie = cookies[SESSION_COOKIE_NAME];

  if (!sessionCookie) return null;

  const session = decodeSession(sessionCookie);
  if (!session) return null;

  // 만료 체크
  if (session.expiresAt < Date.now()) {
    return null;
  }

  return session;
}

// 인증 필수 - 미인증 시 로그인으로 리다이렉트
export function requireAuth(request: Request): Session {
  const session = getSession(request);
  if (!session) {
    throw redirect('/login');
  }
  return session;
}

// 세션 쿠키 생성
export function createSessionCookie(
  userId: string,
  userName: string,
  rememberMe: boolean = false
): string {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30일 또는 1일
  const expiresAt = Date.now() + maxAge * 1000;

  const session: Session = {
    userId,
    userName,
    expiresAt,
  };

  const encoded = encodeSession(session);

  return `${SESSION_COOKIE_NAME}=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

// 세션 쿠키 삭제
export function deleteSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`;
}

// PIN 검증 (PBKDF2 with Web Crypto API)
// 100,000 iterations with SHA-256 (OWASP recommended)
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  // storedHash format: "salt_hex:hash_hex"
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }

  try {
    // Convert hex strings back to Uint8Array
    const salt = hexToBytes(saltHex);
    const storedHashBytes = hexToBytes(hashHex);

    // Derive key from input PIN with same salt
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pinData,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const derivedHash = new Uint8Array(derivedBits);

    // Constant-time comparison to prevent timing attacks
    if (derivedHash.length !== storedHashBytes.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < derivedHash.length; i++) {
      result |= derivedHash[i] ^ storedHashBytes[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

// PIN 해시 생성 (PBKDF2 with Web Crypto API)
export async function hashPin(pin: string): Promise<string> {
  // Generate random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Convert PIN to bytes
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive 256-bit hash using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000, // OWASP recommended minimum
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hash = new Uint8Array(derivedBits);

  // Return format: "salt_hex:hash_hex"
  return `${bytesToHex(salt)}:${bytesToHex(hash)}`;
}
