export type VerificationPurpose = 
  | "ACCOUNT_LOGIN"
  | "PASSWORD_RESET"
  | "ACCOUNT_VERIFICATION"
  | "ADMIN_PASSWORD_RESET";

export interface SendVerificationEmailParams {
  to: string;
  code: string;
  purpose: VerificationPurpose;
  language?: "rw" | "en" | "fr" | "sw" | string;
  recipientName?: string;
  expiresMinutes?: number;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isConfigured?: boolean;
}
