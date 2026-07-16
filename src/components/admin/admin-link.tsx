import Link from "next/link";
import type { ComponentProps } from "react";

/** Admin navigation — prefetch disabled to avoid RSC "Failed to fetch" on auth routes. */
export function AdminLink({ href, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      prefetch={false}
      href={href}
      suppressHydrationWarning
      {...props}
    />
  );
}
