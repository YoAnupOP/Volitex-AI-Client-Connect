import Link from "next/link";

const messages: Record<string, string> = {
  expired: "This link has expired. Please contact your Volitex AI specialist for a new one.", paused: "Portal access is currently paused. Please contact your Volitex AI specialist.", limited: "Please wait a moment before trying another access link.", required: "Use the secure link sent by your Volitex AI specialist to continue.", invalid: "This link is not valid. Please contact your Volitex AI specialist for a new one.",
};
export default async function AccessLinkPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state = "required" } = await searchParams;
  return <main className="shell"><section className="panel narrow"><p className="eyebrow">VOLITEX AI / CONNECT</p><h1>Let’s get you ready.</h1><p className="lead">{messages[state] ?? messages.invalid}</p><p className="support">Need help? <Link href="/support">Contact your Volitex AI specialist</Link>.</p></section></main>;
}
