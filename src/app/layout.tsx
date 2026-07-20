import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volitex AI Connect",
  description: "Securely connect your Meta business assets.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
