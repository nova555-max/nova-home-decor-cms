"use client";

import dynamic from "next/dynamic";
import { useDirection } from "@/hooks";

const AiChatWidget = dynamic(
  () =>
    import("@/components/public/ai-chat-widget").then((m) => ({
      default: m.AiChatWidget,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

export function PublicAiChat() {
  const { locale } = useDirection();
  return <AiChatWidget locale={locale} />;
}
