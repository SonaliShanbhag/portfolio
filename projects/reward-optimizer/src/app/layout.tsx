import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reward Optimizer — Card Fit add-on",
  description:
    "Pick the best credit card per transaction from category reward rates. MVP: in-memory, no accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
