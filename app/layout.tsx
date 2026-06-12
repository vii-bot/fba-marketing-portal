import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FBA Marketing Portal",
  description: "Internal operations portal for Fatbear Agency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: "rgb(15, 17, 23)" }}>
        {children}
      </body>
    </html>
  );
}
