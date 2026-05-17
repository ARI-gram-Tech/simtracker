import api from "@/lib/api";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  Notification, SendEmailRequest, SendNotificationRequest,
} from "@/types/notifications.types";

export const notificationsService = {
  list: () =>
    api.get<Notification[]>(ENDPOINTS.NOTIFICATIONS).then(r => r.data),
 
  markRead: (id: number) =>
    api.post(ENDPOINTS.MARK_READ(id)).then(r => r.data),
 
  markAllRead: () =>
    api.post(ENDPOINTS.MARK_ALL_READ).then(r => r.data),

  clearAll: () =>                                           
    api.delete(ENDPOINTS.CLEAR_ALL).then(r => r.data),
  
  unreadCount: () =>
    api.get<{ unread_count: number }>(ENDPOINTS.UNREAD_COUNT).then(r => r.data),
 
  sendEmail: (data: SendEmailRequest) =>
    api.post(ENDPOINTS.SEND_EMAIL, data).then(r => r.data),
 
  sendNotification: (data: SendNotificationRequest) =>
    api.post(`${ENDPOINTS.NOTIFICATIONS}send/`, data).then(r => r.data),
};