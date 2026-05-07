import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/api/notifications.service";
import type { SendEmailRequest, SendNotificationRequest } from "@/types/notifications.types";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsService.list,
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: notificationsService.unreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (data: SendEmailRequest) => notificationsService.sendEmail(data),
  });
}

export function useSendNotification() {
  return useMutation({
    mutationFn: (data: SendNotificationRequest) =>
      notificationsService.sendNotification(data),
  });
}