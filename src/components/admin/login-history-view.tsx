"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

import {
  formatUserAgent,
  readLoginHistory,
  type LoginHistoryEntry,
} from "@/lib/auth/client-session";
import { useAdminT } from "@/hooks";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginHistoryViewProps = {
  email: string;
  lastSignInAt?: string | null;
};

function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LoginHistoryView({ email, lastSignInAt }: LoginHistoryViewProps) {
  const t = useAdminT();
  const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(readLoginHistory().filter((entry) => entry.email === email));
  }, [email]);

  const locale = typeof navigator !== "undefined" ? navigator.language : "en";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        titleKey="pages.login_history.title"
        subtitleKey="pages.login_history.subtitle"
      />

      {lastSignInAt ? (
        <Card className="border-border/40 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t("login_history.last_sign_in")}</CardTitle>
            <CardDescription>
              {formatWhen(lastSignInAt, locale)}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>{t("login_history.recent_sessions")}</CardTitle>
          <CardDescription>{t("login_history.recent_sessions_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("login_history.empty")}</p>
          ) : (
            <ul className="divide-border divide-y">
              {entries.map((entry, index) => (
                <li
                  key={`${entry.at}-${index}`}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <Monitor className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatUserAgent(entry.userAgent)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatWhen(entry.at, locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
