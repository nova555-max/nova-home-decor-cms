import Link from "next/link";
import { cookies } from "next/headers";

import type { Locale } from "@/config/site";
import { env } from "@/config/env";
import { t } from "@/lib/i18n";
import { LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/locale-cookie";

export default async function TermsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale,
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-20 md:px-10 md:py-28">
      <p className="text-showroom-accent mb-4 text-xs tracking-[0.28em] uppercase">
        {t(locale, "footer", "terms")}
      </p>
      <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
        {t(locale, "legal", "terms_title")}
      </h1>
      <p className="text-muted-foreground mt-8 text-base leading-relaxed md:text-lg">
        {t(locale, "legal", "terms_body")}
      </p>
      <Link
        href="/"
        className="mt-12 inline-flex text-sm text-[var(--gold)] transition hover:opacity-80"
      >
        ← {t(locale, "legal", "back_home")}
      </Link>
    </main>
  );
}
