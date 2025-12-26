import * as CryptoJS from 'crypto-js';

/**
 * Get the encryption key from environment variables
 * Supports Webpack (REACT_APP_CRYPTO_SECURE_KEY) and direct (CRYPTO_SECURE_KEY) formats
 * For Vite projects, use VITE_CRYPTO_SECURE_KEY and configure webpack to expose it as REACT_APP_CRYPTO_SECURE_KEY
 */
function getSecureKey(): string {
  if (typeof process !== 'undefined' && process.env) {
    // Node.js environment
    return process.env.CRYPTO_SECURE_KEY || 'Techuz@123';
  }
  return 'Techuz@123';
}

/**
 * Encrypt a string using AES encryption
 * @param data - The string to encrypt
 * @returns Encrypted string
 */
export function encrypt(data: string): string {
  if (!data) {
    return data;
  }

  const secureKey = getSecureKey();

  if (!secureKey) {
    console.warn('Crypto secure key not found. Encryption disabled.');
    return data;
  }

  try {
    return CryptoJS.AES.encrypt(data, secureKey).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
}

/**
 * Decrypt a string using AES decryption
 * @param data - The encrypted string to decrypt
 * @returns Decrypted string, or original string if decryption fails
 */
export function decrypt(data: string): string {
  if (!data) {
    return data;
  }

  const secureKey = getSecureKey();

  if (!secureKey) {
    // If no key, assume data is not encrypted (backward compatibility)
    return data;
  }

  try {
    // Clean the data: remove spaces (which might come from URL decoding %20)
    // and ensure it's a valid base64 string
    const cleanedData = data.replace(/\s+/g, '');

    // Check if the cleaned data looks like a base64 string
    // Base64 strings should only contain A-Z, a-z, 0-9, +, /, and = for padding
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanedData)) {
      console.log('[cryptoUtils] decrypt - Data does not look like base64, returning original');
      return data;
    }

    const decrypted = CryptoJS.AES.decrypt(cleanedData, secureKey);
    // Check if decryption was successful (sigBytes should be > 0 for valid decryption)
    if (decrypted.sigBytes <= 0) {
      console.log(
        '[cryptoUtils] decrypt - Decryption failed: sigBytes is 0 or negative, returning original data'
      );
      return data;
    }

    let decryptedString;
    try {
      decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    } catch (toStringError) {
      return data;
    }

    // If decryption failed (empty string), return original data (backward compatibility)
    if (!decryptedString || decryptedString.length === 0) {
      console.log('[cryptoUtils] decrypt - Decrypted string is empty, returning original data');
      return data;
    }

    return decryptedString;
  } catch (error) {
    // If decryption fails, assume data is not encrypted (backward compatibility)
    console.error('[cryptoUtils] decrypt - Decryption error:', error);
    return data;
  }
}

/**
 * Safely decrypt a URL parameter value
 * Tries to decrypt, but falls back to original value if decryption fails
 * This ensures backward compatibility with plain text parameters
 * @param value - The parameter value (may be encrypted or plain text)
 * @returns Decrypted value or original value if decryption fails
 */
export function decryptUrlParam(value: string | null): string | null {
  if (!value) {
    return value;
  }

  // Try to decrypt
  const decrypted = decrypt(value);

  // If decryption returned the same value, it was likely plain text
  // If decryption returned a different value, it was encrypted
  return decrypted;
}

/**
 * Encrypt an object to be used as a URL parameter
 * Converts the object to JSON string, then encrypts it
 * @param data - The object to encrypt
 * @returns Encrypted string ready for URL
 */
export function encryptObject(data: Record<string, unknown>): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  try {
    const jsonString = JSON.stringify(data);
    return encrypt(jsonString);
  } catch (error) {
    console.error('[cryptoUtils] encryptObject - Error:', error);
    return '';
  }
}

/**
 * Decrypt and parse a JSON object from URL parameter
 * Tries to decrypt, parse JSON, and return the object
 * Falls back to null if decryption or parsing fails
 * @param value - The encrypted JSON string
 * @returns Parsed object or null if decryption/parsing fails
 */
export function decryptObject(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    // Try to decrypt
    const decrypted = decrypt(value);

    // If decryption failed (returned same value), try parsing as plain JSON
    let jsonString = decrypted;
    if (decrypted === value) {
      // Might be plain JSON (not encrypted)
      jsonString = value;
    }

    // Try to parse as JSON
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.error('[cryptoUtils] decryptObject - Error:', error);
    return null;
  }
}
