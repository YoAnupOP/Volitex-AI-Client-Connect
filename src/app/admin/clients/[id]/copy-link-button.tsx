"use client";

import { useState } from "react";

export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1300); }
  return <button type="button" onClick={() => void copy()} className="mt-3 rounded-md border border-emerald-800 px-3 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500">{copied ? "Copied" : "Copy"}</button>;
}
