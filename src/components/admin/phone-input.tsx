"use client";

import PhoneInput from "react-phone-number-input";

import { toPhoneInputValue } from "@/lib/phone/e164";
import { cn } from "@/lib/utils";

import "react-phone-number-input/style.css";

type PhoneInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-invalid"?: boolean;
  className?: string;
};

export function PhoneInputField({
  id,
  value,
  onChange,
  placeholder,
  "aria-invalid": ariaInvalid,
  className,
}: PhoneInputProps) {
  const phoneValue = toPhoneInputValue(value);

  return (
    <PhoneInput
      id={id}
      international
      defaultCountry="IQ"
      countryCallingCodeEditable={false}
      value={phoneValue}
      onChange={(next) => onChange(next ?? "")}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      className={cn(
        "flex items-center gap-2",
        "[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center",
        "[&_.PhoneInputCountrySelect]:rounded-lg [&_.PhoneInputCountrySelect]:border [&_.PhoneInputCountrySelect]:border-input [&_.PhoneInputCountrySelect]:bg-card [&_.PhoneInputCountrySelect]:px-2 [&_.PhoneInputCountrySelect]:py-1.5",
        "[&_.PhoneInputInput]:h-9 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:rounded-[12px] [&_.PhoneInputInput]:border [&_.PhoneInputInput]:border-input [&_.PhoneInputInput]:bg-card [&_.PhoneInputInput]:px-3 [&_.PhoneInputInput]:py-2 [&_.PhoneInputInput]:text-base [&_.PhoneInputInput]:shadow-soft [&_.PhoneInputInput]:transition-colors [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder:text-muted-foreground [&_.PhoneInputInput]:focus-visible:border-ring [&_.PhoneInputInput]:focus-visible:ring-3 [&_.PhoneInputInput]:focus-visible:ring-ring/30 [&_.PhoneInputInput]:md:text-sm",
        ariaInvalid &&
          "[&_.PhoneInputInput]:border-destructive [&_.PhoneInputInput]:ring-3 [&_.PhoneInputInput]:ring-destructive/20",
        className,
      )}
    />
  );
}
