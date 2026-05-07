// src/hooks/useNotificationToast.ts
// Watches for new notifications, plays a sound, and fires a pop-up toast.
// Drop <NotificationToast /> in your root layout and this hook handles the rest.

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnreadCount, useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/types/notifications.types";

export type ToastNotification = Notification & { toastId: string };

type ToastListener = (n: ToastNotification) => void;

// ── Global event bus (avoids prop-drilling) ───────────────────────────────────
const listeners = new Set<ToastListener>();

export function subscribeToToasts(fn: ToastListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitToast(n: ToastNotification) {
  listeners.forEach(fn => fn(n));
}

// ── Sound player ──────────────────────────────────────────────────────────────
// Uses the Web Audio API to synthesise a soft two-tone chime — no external file needed.
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now,        0.15, 0.15); // A5 — first chime
    playTone(1108, now + 0.1, 0.2,  0.1);  // C#6 — second chime (higher, softer)

    // Close context after sound finishes
    setTimeout(() => ctx.close(), 600);
  } catch {
    // AudioContext not supported — fail silently
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useNotificationToast() {
  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData } = useNotifications();
  const prevUnreadRef = useRef<number | null>(null);
  const prevIdsRef    = useRef<Set<number>>(new Set());

  const getNotifications = useCallback((): Notification[] => {
    const raw = notificationsData as unknown;
    return Array.isArray(raw)
      ? raw
      : (raw as { results?: Notification[] })?.results ?? [];
  }, [notificationsData]);

  useEffect(() => {
    const currentUnread = unreadData?.unread_count ?? 0;
    const notifications = getNotifications();

    // On first load — just record the baseline, don't toast
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = currentUnread;
      prevIdsRef.current = new Set(notifications.map(n => n.id));
      return;
    }

    // Detect brand-new notifications (ids not seen before)
    const newNotifications = notifications.filter(
      n => !prevIdsRef.current.has(n.id) && !n.is_read
    );

    if (newNotifications.length > 0) {
      playNotificationSound();

      // Show toast for the most recent new notification
      const latest = newNotifications[0];
      emitToast({
        ...latest,
        toastId: `${latest.id}-${Date.now()}`,
      });

      // If multiple arrived at once, queue the rest with a small delay
      newNotifications.slice(1).forEach((n, i) => {
        setTimeout(() => {
          emitToast({ ...n, toastId: `${n.id}-${Date.now()}-${i}` });
        }, (i + 1) * 400);
      });
    }

    // Update refs
    prevUnreadRef.current = currentUnread;
    prevIdsRef.current = new Set(notifications.map(n => n.id));
  }, [unreadData, notificationsData, getNotifications]);
}