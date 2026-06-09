import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FBA X Department — Internal Training Platform",
  description: "Internal training and operations platform for the FBA X Department",
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
