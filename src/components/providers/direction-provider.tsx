"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type Direction, type Locale, siteConfig } from "@/config/site";
import { LOCALE_COOKIE_NAME } from "@/lib/locale-cookie";
import { getDirectionForLocale, getFontClassForLocale } from "@/lib/rtl";
import { cn } from "@/lib/utils";

type DirectionContextValue = {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  isRtl: boolean;
  isSwitching: boolean;
};

const DirectionContext = createContext<DirectionContextValue | null>(null);

type DirectionProviderProps = {
  children: React.ReactNode;
  initialLocale?: Locale;
};

export function DirectionProvider({
  children,
  initialLocale = siteConfig.defaultLocale,
}: DirectionProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isSwitching, setIsSwitching] = useState(false);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const direction = useMemo(() => getDirectionForLocale(locale), [locale]);
  const fontClass = useMemo(() => getFontClassForLocale(locale), [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState((current) => {
      if (current === nextLocale) return current;
      setIsSwitching(true);
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      switchTimerRef.current = setTimeout(() => setIsSwitching(false), 320);
      return nextLocale;
    });
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale};path=/;max-age=31536000`;
  }, []);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = direction;
    root.dataset.direction = direction;
    root.dataset.locale = locale;
    root.classList.toggle("is-rtl", direction === "rtl");
    root.classList.toggle("is-ltr", direction === "ltr");

    document.body.dir = direction;
    document.body.style.direction = direction;
    document.body.dataset.direction = direction;
    document.body.classList.remove(
      "font-english",
      "font-arabic",
      "font-kurdish",
      "font-rudaw",
    );
    document.body.classList.add(fontClass);
  }, [direction, fontClass, locale]);

  const value = useMemo(
    () => ({
      locale,
      direction,
      setLocale,
      isRtl: direction === "rtl",
      isSwitching,
    }),
    [direction, isSwitching, locale, setLocale],
  );

  return (
    <DirectionContext.Provider value={value}>
      <div
        data-direction-root
        dir={direction}
        data-direction={direction}
        data-switching={isSwitching ? "true" : undefined}
        className={cn(
          "min-h-svh w-full transition-[opacity,transform] duration-300 ease-out",
          isSwitching && "opacity-[0.97]",
        )}
      >
        {children}
      </div>
    </DirectionContext.Provider>
  );
}

const defaultDirectionContext = (): DirectionContextValue => {
  const locale = siteConfig.defaultLocale;
  const direction = getDirectionForLocale(locale);
  return {
    locale,
    direction,
    setLocale: () => {},
    isRtl: direction === "rtl",
    isSwitching: false,
  };
};

export function useDirection() {
  const context = useContext(DirectionContext);
  return context ?? defaultDirectionContext();
}
