export type NotificationType =
  | "issue"
  | "return"
  | "receive"
  | "alert"
  | "system"
  | "finance";

export type EmailLogStatus = "sent" | "failed";

export interface Notification {
  id: number;
  recipient: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  body: string;
  status: EmailLogStatus;
  error_message: string;
  sent_at: string;
}

export interface SendEmailRequest {
  recipient_email: string;
  subject: string;
  body: string;
  html_body?: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface SendNotificationRequest {
  recipient_id: number;
  title: string;
  message: string;
  type?: Notification["type"];
  send_email_copy?: boolean;
}