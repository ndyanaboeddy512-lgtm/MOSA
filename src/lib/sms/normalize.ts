/**
 * Rwanda Phone Number Normalizer
 * Standardizes phone numbers to E.164 canonical format (+2507XXXXXXXX)
 * Validates prefixes for Rwanda mobile operators:
 * - MTN Rwanda: 078, 079
 * - Airtel Rwanda: 072, 073
 */

export interface NormalizedPhone {
  isValid: boolean;
  raw: string;
  e164?: string;
  local?: string;
  carrier?: string;
  error?: string;
}

function parseRwandaPhone(input: string): NormalizedPhone {
  if (!input || typeof input !== 'string') {
    return { isValid: false, raw: input, error: 'Phone number is required' };
  }

  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith('07') && cleaned.length === 10) {
    cleaned = '250' + cleaned.substring(1);
  }

  if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '250' + cleaned;
  }

  if (!cleaned.startsWith('2507') || cleaned.length !== 12) {
    return {
      isValid: false,
      raw: input,
      error: 'Invalid Rwandan phone number format. Must be 9-12 digits starting with 07X or +2507X.',
    };
  }

  const prefix = cleaned.substring(3, 5);
  let carrier: string | null = null;
  if (prefix === '78' || prefix === '79') {
    carrier = 'MTN Rwanda';
  } else if (prefix === '72' || prefix === '73') {
    carrier = 'Airtel Rwanda';
  }

  if (!carrier) {
    return {
      isValid: false,
      raw: input,
      error: `Unsupported Rwandan mobile operator prefix '0${prefix}'. Valid prefixes are 078/079 (MTN) or 072/073 (Airtel).`,
    };
  }

  const e164 = '+' + cleaned;
  const local = '0' + cleaned.substring(3);

  return {
    isValid: true,
    raw: input,
    e164,
    local,
    carrier,
  };
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return '****';
  const clean = phone.trim();
  const start = clean.slice(0, 6);
  const end = clean.slice(-4);
  return start + '****' + end;
}

/**
 * Universal Phone Normalizer
 * Standardizes phone numbers to E.164 canonical format (+...)
 * Seamlessly accepts both Rwandan mobile formats and international numbers worldwide.
 */
export function normalizePhoneNumber(input: string): NormalizedPhone {
  if (!input || typeof input !== 'string') {
    return { isValid: false, raw: input, error: 'Phone number is required' };
  }

  const trimmed = input.trim();
  const digitsOnly = trimmed.replace(/[\s\-\(\)\.]/g, '');

  // 1. If it looks like a Rwandan local number (078/079/072/073 or +250...)
  if (
    digitsOnly.startsWith('07') ||
    (digitsOnly.startsWith('7') && digitsOnly.length === 9) ||
    digitsOnly.startsWith('2507') ||
    digitsOnly.startsWith('+2507')
  ) {
    const rwResult = parseRwandaPhone(input);
    if (rwResult.isValid) {
      return rwResult;
    }
  }

  // 2. International E.164 format (+ followed by 7-15 digits) or general digits
  const e164Regex = /^\+?[1-9]\d{6,14}$/;
  if (e164Regex.test(digitsOnly)) {
    const e164 = digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`;
    return {
      isValid: true,
      raw: input,
      e164,
      carrier: 'International',
    };
  }

  return {
    isValid: false,
    raw: input,
    error: 'Invalid phone number format. Please enter a valid local number (078/079/072/073) or international number with country code (e.g. +256..., +254..., or +1...).',
  };
}

/**
 * Backwards-compatible normalizeRwandaPhone:
 * Now delegates to normalizePhoneNumber so existing calls allow international users.
 */
export function normalizeRwandaPhone(input: string): NormalizedPhone {
  return normalizePhoneNumber(input);
}
