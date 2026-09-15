"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = { label: string; loadingLabel?: string; successLabel?: string; className?: string };

export function ActionButton({ label, loadingLabel = "Saving…", successLabel = "Saved", className = "" }: Props) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false); const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (pending) { wasPending.current = true; setComplete(false); return; }
    if (!wasPending.current) return;
    wasPending.current = false; setComplete(true);
    const timer = window.setTimeout(() => setComplete(false), 1300);
    return () => window.clearTimeout(timer);
  }, [pending]);
  const text = pending ? loadingLabel : complete ? successLabel : label;
  return <button type="submit" disabled={pending} aria-live="polite" className={`${className} disabled:cursor-not-allowed disabled:opacity-65`}>
    {pending && <span aria-hidden="true" className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]" />}{text}
  </button>;
}
