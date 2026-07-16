"use client";

import { ADMIN_LOGIN_HISTORY_KEY } from "@/lib/auth/config";

export type LoginHistoryEntry = {
  at: string;
  email: string;
  userAgent: string;
};

const SESSION_PREFIXES = ["nova-ai-chat", "nova-admin-session"];

export function clearClientSessionData(): void {
  if (typeof window === "undefined") return;

  for (const key of Object.keys(localStorage)) {
    if (SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }

  sessionStorage.clear();
}

export function recordLoginEvent(email: string): void {
  if (typeof window === "undefined") return;

  const entry: LoginHistoryEntry = {
    at: new Date().toISOString(),
    email,
    userAgent: navigator.userAgent,
  };

  const existing = readLoginHistory();
  const next = [entry, ...existing].slice(0, 20);
  localStorage.setItem(ADMIN_LOGIN_HISTORY_KEY, JSON.stringify(next));
}

export function readLoginHistory(): LoginHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(ADMIN_LOGIN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LoginHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatUserAgent(userAgent: string): string {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Chrome";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
  return "Browser";
}
