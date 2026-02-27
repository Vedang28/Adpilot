'use strict';

const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX   = process.env.ENCRYPTION_KEY || '0'.repeat(64); // 32-byte hex
const KEY        = Buffer.from(KEY_HEX, 'hex');

/**
 * AES-256-GCM token encryption/decryption.
 * Each encryption uses a fresh random IV (12 bytes) + auth tag (16 bytes).
 * Stored format: iv:authTag:ciphertext (all hex)
 */
class TokenEncryptionService {
  encrypt(plaintext) {
    if (!plaintext) return null;
    const iv     = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, KEY, iv);
    const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag    = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(stored) {
    if (!stored) return null;
    const [ivHex, tagHex, cipherHex] = stored.split(':');
    const iv       = Buffer.from(ivHex,    'hex');
    const tag      = Buffer.from(tagHex,   'hex');
    const cipher   = Buffer.from(cipherHex,'hex');
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(cipher, 'binary', 'utf8') + decipher.final('utf8');
  }

  encryptFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
      if (result[field]) result[field] = this.encrypt(result[field]);
    }
    return result;
  }

  decryptFields(obj, fields) {
    if (!obj) return obj;
    const result = { ...obj };
    for (const field of fields) {
      if (result[field]) result[field] = this.decrypt(result[field]);
    }
    return result;
  }
}

module.exports = new TokenEncryptionService();
