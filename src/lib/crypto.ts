import crypto from 'crypto';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'mosa-aes-256-encryption-key-rwanda-2026-secure';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

/**
 * AES-256-GCM encryption for sensitive fields at rest (National ID, business documents)
 */
export function encryptSensitiveText(plainText: string): string {
  if (!plainText) return plainText;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return 'enc:' + iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

/**
 * AES-256-GCM decryption for sensitive fields at rest
 */
export function decryptSensitiveText(cipherText: string): string {
  if (!cipherText || !cipherText.startsWith('enc:')) return cipherText;
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4) return cipherText;
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '[Protected Document]';
  }
}

/**
 * Masks a 16-digit Rwandan National ID for secure display
 * e.g. 1199080012345678 -> 1 1990 •••• •••• 5678
 */
export function maskNationalId(id: string): string {
  if (!id) return '••••';
  const clean = id.trim().replace(/\s/g, '');
  if (clean.length === 16) {
    return clean.slice(0, 1) + ' ' + clean.slice(1, 5) + ' •••• •••• ' + clean.slice(-4);
  }
  if (clean.length <= 6) return '••••';
  return clean.slice(0, 4) + '••••' + clean.slice(-4);
}

/**
 * Password strength validator
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}
