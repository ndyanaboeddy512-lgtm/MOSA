export type SMSTemplateId = 
  | "UPDATE_SUCCESS" 
  | "REMINDER" 
  | "SECURITY_ALERT" 
  | "PROFILE_CONFIRMATION" 
  | "DEMAND_ALERT";

export type SMSLanguage = "rw" | "en" | "fr" | "sw";

export type SMSDeliveryStatus = 
  | "CONFIGURATION_REQUIRED" 
  | "PENDING" 
  | "SENT" 
  | "DELIVERED" 
  | "FAILED";

export interface SMSMessagePayload {
  businessId?: string;
  recipientPhone: string;
  templateId: SMSTemplateId;
  language?: SMSLanguage;
  variables: Record<string, string | number>;
}

export interface SMSSendResult {
  success: boolean;
  status: SMSDeliveryStatus;
  provider: string;
  messageId?: string;
  messageBody: string;
  loggedId?: string;
  error?: string;
}

export interface SMSProvider {
  name: string;
  isConfigured: boolean;
  send(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
