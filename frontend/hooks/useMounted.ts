"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client. Used to
 * gate rendering of values that come from persisted (localStorage) stores so
 * server and first client render agree — avoiding hydration mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
