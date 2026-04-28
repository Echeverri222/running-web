import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Running Web",
  description: "Personalized running plans with Strava import",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
