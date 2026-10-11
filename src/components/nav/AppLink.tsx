"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  /** Default false — avoid prefetch Flight traffic on the pinned 16.3.8/19.2.3 stack. */
  prefetch?: boolean;
};

/**
 * Soft-nav Link wrapper. Prefer over bare <a> for in-app routes so Next can
 * stream loading.tsx instead of waiting on a full document reload.
 */
export function AppLink({ prefetch = false, ...props }: Props) {
  return <Link prefetch={prefetch} {...props} />;
}
