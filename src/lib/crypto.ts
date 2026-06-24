// Client-side zero-knowledge cryptography helper using Web Crypto API.
// Works in both Node.js (v15+) and all modern browsers.

// Helper functions for conversions
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex: string): ArrayBuffer {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Derives the 256-bit symmetric Master Key using PBKDF2.
 * Salt is the user's email. Iterations = 100,000.
 */
export async function deriveMasterKey(password: string, email: string): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle || (window?.crypto?.subtle);
  if (!subtle) {
    throw new Error('Web Crypto API is not supported in this environment');
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(email.toLowerCase().trim());

  // Import raw password
  const rawKey = await subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive master key
  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true, // Must be exportable so we can cache the hex raw value in session memory
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives the Authentication Hash that is sent to the server for login verification.
 * Derived from the Master Key and Master Password using PBKDF2 with 1 iteration.
 */
export async function deriveAuthHash(masterKey: CryptoKey, password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle || (window?.crypto?.subtle);
  if (!subtle) {
    throw new Error('Web Crypto API is not supported');
  }

  const rawMasterKey = await subtle.exportKey('raw', masterKey);
  const baseKey = await subtle.importKey(
    'raw',
    rawMasterKey,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const encoder = new TextEncoder();
  const saltBuffer = encoder.encode(password); // password as salt

  const authHashBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 1,
      hash: 'SHA-256',
    },
    baseKey,
    256 // 256 bits = 32 bytes
  );

  return bufferToHex(authHashBits);
}

/**
 * Exports a CryptoKey to its raw hex string.
 */
export async function exportKeyToHex(key: CryptoKey): Promise<string> {
  const subtle = globalThis.crypto?.subtle || (window?.crypto?.subtle);
  const raw = await subtle.exportKey('raw', key);
  return bufferToHex(raw);
}

/**
 * Imports a CryptoKey from a hex string.
 */
export async function importKeyFromHex(hex: string): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle || (window?.crypto?.subtle);
  const buffer = hexToBuffer(hex);
  return await subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using AES-GCM (256-bit) with the derived Master Key.
 * Returns the hex encoded ciphertext and iv.
 */
export async function encryptData(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const subtle = globalThis.crypto?.subtle || (window?.crypto?.subtle);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
  
  const encoder = new TextEncoder();
  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    iv: bufferToHex(iv.buffer),
  };
}

/**
 * Decrypts a string using AES-GCM (256-bit) with the derived Master Key.
 */
export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const subtle = globalThis.crypto?.subtle || (window?.crypto?.subtle);
  
  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: hexToBuffer(iv),
    },
    key,
    hexToBuffer(ciphertext)
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypts an object by converting it to a JSON string first.
 */
export async function encryptObject(obj: any, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const plaintext = JSON.stringify(obj);
  return await encryptData(plaintext, key);
}

/**
 * Decrypts a JSON string and parses it back to an object.
 */
export async function decryptObject(ciphertext: string, iv: string, key: CryptoKey): Promise<any> {
  const plaintext = await decryptData(ciphertext, iv, key);
  return JSON.parse(plaintext);
}
