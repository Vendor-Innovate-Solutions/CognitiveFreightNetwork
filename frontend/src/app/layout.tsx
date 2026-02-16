import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Cognitive Freight Network",
  description: "AI-powered logistics intelligence and route optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased erp-cfn-theme">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
