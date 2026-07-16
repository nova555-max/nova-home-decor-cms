"use client";

import dynamic from "next/dynamic";

import { useAdminT } from "@/hooks";
import { useDirection } from "@/hooks";

const AiChatWidget = dynamic(
  () =>
    import("@/components/public/ai-chat-widget").then((m) => ({
      default: m.AiChatWidget,
    })),
  { ssr: false, loading: () => null },
);

export function AdminAiAssistant() {
  const { locale } = useDirection();
  const t = useAdminT();

  return (
    <AiChatWidget
      locale={locale}
      storageKey="nova-admin-ai-chat"
      greeting={t("ai.admin_greeting")}
    />
  );
}
