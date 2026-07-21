import { Phone } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import {
  collectPhones,
  normalizePhone,
  type NormalizedPhone,
} from "@/lib/phone/e164";
import { cn } from "@/lib/utils";

const ltrIsolateStyle: CSSProperties = {
  direction: "ltr",
  unicodeBidi: "isolate",
  textAlign: "left",
};

type PhoneTextProps = {
  phone: string | null | undefined;
  className?: string;
};

/** Always LTR international display — never reverses in RTL pages. */
export function PhoneText({ phone, className }: PhoneTextProps) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  return (
    <bdi
      dir="ltr"
      className={cn("phone-ltr inline-block whitespace-nowrap", className)}
      style={ltrIsolateStyle}
    >
      {normalized.displayIsolated}
    </bdi>
  );
}

type PhoneLinkProps = {
  phone: string | null | undefined;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
  children?: ReactNode;
};

export function PhoneLink({
  phone,
  className,
  iconClassName,
  showIcon = true,
  children,
}: PhoneLinkProps) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  return (
    <a
      href={normalized.telHref}
      dir="ltr"
      className={cn("phone-ltr", className)}
      style={ltrIsolateStyle}
    >
      {showIcon ? (
        <Phone
          className={cn("size-4 shrink-0 opacity-70", iconClassName)}
          aria-hidden
        />
      ) : null}
      {children ?? (
        <bdi dir="ltr" className="phone-ltr whitespace-nowrap" style={ltrIsolateStyle}>
          {normalized.displayIsolated}
        </bdi>
      )}
    </a>
  );
}

type PhoneLinkListProps = {
  phones?: Array<string | null | undefined>;
  fields?: Array<string | null | undefined>;
  className?: string;
  itemClassName?: string;
  iconClassName?: string;
  showIcon?: boolean;
};

export function PhoneLinkList({
  phones,
  fields,
  className,
  itemClassName,
  iconClassName,
  showIcon = true,
}: PhoneLinkListProps) {
  const list: NormalizedPhone[] = phones
    ? phones
        .map((p) => normalizePhone(p))
        .filter((p): p is NormalizedPhone => !!p)
    : collectPhones(...(fields ?? []));

  if (!list.length) return null;

  return (
    <ul className={cn("space-y-3", className)}>
      {list.map((item) => (
        <li key={item.e164} dir="ltr" className="phone-ltr flex justify-start">
          <PhoneLink
            phone={item.e164}
            className={itemClassName}
            iconClassName={iconClassName}
            showIcon={showIcon}
          />
        </li>
      ))}
    </ul>
  );
}
