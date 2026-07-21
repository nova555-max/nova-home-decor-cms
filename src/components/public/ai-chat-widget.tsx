"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Copy,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Printer,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "@/lib/motion";

import type { Locale } from "@/config/site";
import { getModuleLabel } from "@/lib/ai/modules/registry";
import { SUGGESTED_QUESTIONS } from "@/lib/ai/prompts";
import type { AiChatMeta, ChatMessage } from "@/lib/ai/types";
import type { AiConsultantModule, CmsProductCard } from "@/lib/ai/search/types";
import { t } from "@/lib/i18n";
import { coerceToText } from "@/lib/i18n/cms-text";
import { formatInternationalPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDirection } from "@/hooks";

const MAX_RETRIES = 2;
const DEFAULT_STORAGE_KEY = "nova-ai-chat-history";
const FAVORITES_KEY = "nova-favorites";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type StoredMessage = ChatMessage & {
  products?: CmsProductCard[];
  relatedProducts?: CmsProductCard[];
  crossSellProducts?: CmsProductCard[];
  upsellProducts?: CmsProductCard[];
  module?: string;
  companyInfo?: AiChatMeta["companyInfo"];
};

type AiChatWidgetProps = {
  locale: Locale;
  storageKey?: string;
  greeting?: string;
};

function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function loadHistory(key: string): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredMessage[];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

function saveHistory(key: string, messages: StoredMessage[]) {
  try {
    localStorage.setItem(key, JSON.stringify(messages.slice(-40)));
  } catch {
    /* quota exceeded */
  }
}

function parseMetaHeader(value: string | null): AiChatMeta | null {
  if (!value) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json) as AiChatMeta;
  } catch {
    return null;
  }
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="bg-muted/60 h-3 w-3/4 animate-pulse rounded-full" />
      <div className="bg-muted/40 h-3 w-1/2 animate-pulse rounded-full" />
      <div className="bg-muted/30 h-3 w-2/3 animate-pulse rounded-full" />
    </div>
  );
}

function ProductCards({
  products,
  locale,
  labelKey = "products_found",
}: {
  products: CmsProductCard[];
  locale: Locale;
  labelKey?: "products_found" | "related_products" | "cross_sell" | "upsell";
}) {
  if (!products.length) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {t(locale, "ai", labelKey)}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {products.slice(0, 4).map((product) => (
          <a
            key={product.id}
            href={`#product-${product.slug}`}
            className="border-border bg-card hover:border-[var(--gold)] flex w-36 shrink-0 flex-col overflow-hidden rounded-[12px] border transition"
          >
            {product.imageUrl ? (
              <div className="relative aspect-[4/3] w-full bg-muted">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              </div>
            ) : (
              <div className="bg-muted flex aspect-[4/3] items-center justify-center">
                <Sparkles className="text-[var(--gold)] size-4 opacity-60" />
              </div>
            )}
            <div className="p-2">
              <p className="line-clamp-2 text-[11px] leading-snug font-medium">
                {product.name}
              </p>
              {product.category ? (
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  {product.category}
                </p>
              ) : null}
              {product.price != null ? (
                <p className="text-[var(--gold)] mt-1 text-[10px] font-semibold">
                  {product.price.toLocaleString()}
                </p>
              ) : null}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function QuotePrintPanel({
  locale,
  content,
  products,
  companyInfo,
}: {
  locale: Locale;
  content: string;
  products: CmsProductCard[];
  companyInfo?: AiChatMeta["companyInfo"];
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${t(locale, "ai", "quote_title")}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#2f2f2f;background:#f8f7f2}
        h1{font-size:20px;margin:0 0 8px}
        .muted{color:#666;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px}
        th,td{border-bottom:1px solid #e8e5dc;padding:10px 6px;text-align:start}
        th{color:#666;font-weight:600}
        .gold{color:#c9a96e;font-weight:600}
        pre{white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.5;margin-top:16px}
      </style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="border-border mt-3 rounded-[12px] border bg-background/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-wide text-[var(--gold)] uppercase">
          {t(locale, "ai", "quote_mode")}
        </p>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/40 px-2.5 py-1 text-[10px] font-medium text-[var(--gold)] transition hover:bg-[var(--gold)]/10"
        >
          <Printer className="size-3" />
          {t(locale, "ai", "print_quote")}
        </button>
      </div>
      <div ref={printRef} className="quote-print-root">
        <h1>{t(locale, "ai", "quote_title")}</h1>
        {companyInfo ? (
          <p className="muted" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
            {[
              companyInfo.name,
              formatInternationalPhone(companyInfo.phone),
              formatInternationalPhone(companyInfo.whatsapp),
              companyInfo.address,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {products.length ? (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category ?? "—"}</td>
                  <td className="gold">
                    {p.price != null ? p.price.toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <pre>{content}</pre>
      </div>
    </div>
  );
}

function AssistantExtras({
  msg,
  locale,
}: {
  msg: StoredMessage;
  locale: Locale;
}) {
  const isQuote = msg.module === "quote_generator";

  return (
    <>
      {msg.module ? (
        <span className="mt-2 inline-flex rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--gold)]">
          {getModuleLabel(msg.module as AiConsultantModule, locale)}
        </span>
      ) : null}
      {msg.products?.length ? (
        <ProductCards products={msg.products} locale={locale} />
      ) : null}
      {msg.relatedProducts?.length ? (
        <ProductCards
          products={msg.relatedProducts}
          locale={locale}
          labelKey="related_products"
        />
      ) : null}
      {msg.crossSellProducts?.length ? (
        <ProductCards
          products={msg.crossSellProducts}
          locale={locale}
          labelKey="cross_sell"
        />
      ) : null}
      {msg.upsellProducts?.length ? (
        <ProductCards
          products={msg.upsellProducts}
          locale={locale}
          labelKey="upsell"
        />
      ) : null}
      {isQuote && (msg.products?.length || msg.content) ? (
        <QuotePrintPanel
          locale={locale}
          content={msg.content}
          products={msg.products ?? []}
          companyInfo={msg.companyInfo}
        />
      ) : null}
    </>
  );
}

export function AiChatWidget({
  locale: localeProp,
  storageKey = DEFAULT_STORAGE_KEY,
  greeting: greetingProp,
}: AiChatWidgetProps) {
  const { locale: contextLocale, direction, isRtl } = useDirection();
  const locale = contextLocale ?? localeProp;
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const fabBottom = isAdmin
    ? "bottom-6"
    : "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6";
  const panelBottom = isAdmin
    ? "bottom-24"
    : "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-28";

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingText, setTypingText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    data: string;
    mimeType: string;
    preview: string;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setMessages(loadHistory(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (hydrated) saveHistory(storageKey, messages);
  }, [messages, hydrated, storageKey]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === "undefined") return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        locale === "en" ? "en-US" : locale === "ar" ? "ar-SA" : "ckb-IQ";
      window.speechSynthesis.speak(utterance);
    },
    [locale, voiceEnabled],
  );

  const send = useCallback(
    async (
      retryMessages?: StoredMessage[],
      overrideText?: string,
      imageOverride?: typeof pendingImage,
    ) => {
      const payload = retryMessages ?? messages;
      const trimmed = (overrideText ?? input).trim();
      const image = imageOverride ?? pendingImage;
      if (!trimmed && !retryMessages && !image) return;
      if (streaming) return;

      const userContent =
        trimmed ||
        (image ? t(locale, "ai", "visual_search") : "");

      const nextMessages: StoredMessage[] = retryMessages
        ? payload
        : [...payload, { role: "user", content: userContent }];

      if (!retryMessages) {
        setInput("");
        setPendingImage(null);
        setMessages(nextMessages);
      }

      setStreaming(true);
      setError(null);
      setTypingText("");
      scrollToBottom();

      let attempt = 0;
      let lastError = "Request failed";

      while (attempt <= MAX_RETRIES) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        try {
          const body: Record<string, unknown> = {
            messages: nextMessages,
            locale,
            favoriteIds: readFavoriteIds(),
          };
          if (image) {
            body.image = { data: image.data, mimeType: image.mimeType };
          }

          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: abortRef.current.signal,
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
              code?: string;
            };
            if (data.code === "GEMINI_QUOTA" || data.error === "quota_exceeded") {
              throw new Error("quota_exceeded");
            }
            throw new Error(data.error ?? `Error ${response.status}`);
          }

          if (!response.body) throw new Error("Empty response");

          const meta = parseMetaHeader(response.headers.get("X-AI-Meta"));
          const moduleHeader = response.headers.get("X-AI-Module") ?? meta?.module;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let full = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            full += chunk;
            setTypingText(full);
            scrollToBottom();
          }

          const normalized = coerceToText(full).trim();
          if (!normalized) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[ai-chat] Invalid assistant response payload:", full);
            }
            throw new Error("invalid_response");
          }

          const assistantMsg: StoredMessage = {
            role: "assistant",
            content: normalized,
            products: meta?.products,
            relatedProducts: meta?.relatedProducts,
            crossSellProducts: meta?.crossSellProducts,
            upsellProducts: meta?.upsellProducts,
            module: moduleHeader ?? undefined,
            companyInfo: meta?.companyInfo,
          };

          setMessages([...nextMessages, assistantMsg]);
          setTypingText("");
          setStreaming(false);
          speak(normalized);
          scrollToBottom();
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (err instanceof Error && err.message === "quota_exceeded") {
            lastError = t(locale, "ai", "quota_error");
            break;
          }
          if (err instanceof Error && err.message === "invalid_response") {
            lastError = t(locale, "ai", "invalid_response");
            break;
          }
          lastError =
            err instanceof Error ? err.message : "Something went wrong";
          attempt += 1;
          if (attempt <= MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 800 * attempt));
          }
        }
      }

      setError(lastError);
      setTypingText("");
      setStreaming(false);
      if (!retryMessages) setMessages(nextMessages);
    },
    [input, locale, messages, pendingImage, scrollToBottom, speak, streaming],
  );

  const retry = () => {
    if (messages.length === 0) return;
    const withoutFailed = messages.filter(
      (_, i) => i < messages.length - 1 || messages[i]?.role !== "assistant",
    );
    void send(withoutFailed);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setTypingText("");
    localStorage.removeItem(storageKey);
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const toggleVoiceInput = () => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognitionCtor) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang =
      locale === "en" ? "en-US" : locale === "ar" ? "ar-SA" : "ckb-IQ";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError(t(locale, "ai", "image_invalid"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t(locale, "ai", "image_too_large"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setPendingImage({
        data,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        preview: data,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const suggested = SUGGESTED_QUESTIONS[locale] ?? SUGGESTED_QUESTIONS.ku;
  const greeting = greetingProp ?? t(locale, "ai", "greeting");

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            dir={direction}
            className={cn(
              "border-border bg-card fixed inset-x-3 z-[60] flex max-h-[min(78dvh,36rem)] w-auto flex-col overflow-hidden rounded-[20px] border shadow-soft-xl sm:inset-x-auto sm:start-6 sm:end-auto sm:w-[min(100vw-2rem,26rem)] md:start-auto md:end-8",
              panelBottom,
            )}
          >
            <header className="flex items-center justify-between gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary-foreground/10">
                  <Sparkles className="size-4 text-[var(--gold)]" />
                </div>
                <div>
                  <span className="block text-sm font-medium">
                    {t(locale, "ai", "title")}
                  </span>
                  <span className="text-[10px] text-primary-foreground/70">
                    Nova Home Decor
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="inline-flex size-11 items-center justify-center rounded-full transition hover:bg-primary-foreground/15"
                    aria-label={t(locale, "ai", "clear")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-11 items-center justify-center rounded-full transition hover:bg-primary-foreground/15"
                  aria-label={t(locale, "ai", "close")}
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div
              ref={listRef}
              className="flex max-h-[min(52vh,24rem)] flex-1 flex-col gap-3 overflow-y-auto p-4"
            >
              {messages.length === 0 && !typingText ? (
                <div className="flex flex-col gap-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {greeting}
                  </p>
                  <div>
                    <p className="text-muted-foreground mb-2 text-[10px] font-medium tracking-wide uppercase">
                      {t(locale, "ai", "suggested")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggested.map((q) => (
                        <button
                          key={q}
                          type="button"
                          disabled={streaming}
                          onClick={() => void send(undefined, q)}
                          className="border-border bg-muted/50 hover:border-[var(--gold)] hover:text-[var(--gold)] rounded-full border px-2.5 py-1 text-[11px] transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "group max-w-[92%] rounded-[16px] px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ms-auto"
                      : "bg-muted text-foreground",
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === "assistant" ? (
                    <AssistantExtras msg={msg} locale={locale} />
                  ) : null}
                  {msg.role === "assistant" ? (
                    <div className="mt-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => void copyMessage(msg.content)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px]"
                      >
                        <Copy className="size-3" />
                        {t(locale, "ai", "copy")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              {streaming && !typingText ? <ChatSkeleton /> : null}

              {typingText ? (
                <div className="bg-muted max-w-[92%] rounded-[16px] px-3 py-2 text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap">{typingText}</div>
                  <span className="text-[var(--gold)] ms-0.5 inline-block animate-pulse">
                    ▍
                  </span>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[12px] border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  {error}
                  <button
                    type="button"
                    onClick={retry}
                    className="text-foreground mt-2 inline-flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="size-3" />
                    {t(locale, "ai", "retry")}
                  </button>
                </div>
              ) : null}
            </div>

            {pendingImage ? (
              <div className="border-border flex items-center gap-2 border-t px-3 py-2">
                <div className="relative size-12 overflow-hidden rounded-[8px]">
                  <Image
                    src={pendingImage.preview}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <span className="text-muted-foreground flex-1 text-xs">
                  {t(locale, "ai", "visual_search")}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : null}

            <form
              className="flex items-end gap-1.5 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={streaming}
                className="text-muted-foreground hover:text-[var(--gold)] inline-flex size-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40"
                aria-label={t(locale, "ai", "upload_image")}
              >
                <ImagePlus className="size-4" />
              </button>
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={streaming}
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40",
                  listening
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground hover:text-[var(--gold)]",
                )}
                aria-label={t(locale, "ai", "voice_input")}
              >
                {listening ? (
                  <MicOff className="size-4" />
                ) : (
                  <Mic className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setVoiceEnabled((v) => !v)}
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition",
                  voiceEnabled
                    ? "text-[var(--gold)]"
                    : "text-muted-foreground hover:text-[var(--gold)]",
                )}
                aria-label={t(locale, "ai", "voice_output")}
              >
                {voiceEnabled ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeX className="size-4" />
                )}
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
                dir={direction}
                placeholder={
                  listening
                    ? t(locale, "ai", "listening")
                    : t(locale, "ai", "placeholder")
                }
                disabled={streaming}
                className="border-input bg-background max-h-24 min-h-11 flex-1 resize-none rounded-[12px] border px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="submit"
                disabled={streaming || (!input.trim() && !pendingImage)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] shadow-soft transition hover:bg-[var(--gold-hover)] disabled:opacity-50"
                aria-label={t(locale, "ai", "send")}
              >
                {streaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className={cn("size-4", isRtl && "scale-x-[-1]")} />
                )}
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        data-ai-chat-trigger
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "fixed z-[60] inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft-lg ring-2 ring-[var(--gold)]/30",
          isAdmin
            ? "end-4 md:end-8"
            : "start-4 md:start-auto md:end-8",
          fabBottom,
        )}
        aria-label={t(locale, "ai", "open")}
      >
        <Sparkles className="size-5 text-[var(--gold)]" />
      </motion.button>
    </>
  );
}
