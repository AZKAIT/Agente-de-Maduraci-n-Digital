import type { Metadata } from "next";
import { Poppins, Montserrat } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import React from "react";
import Script from "next/script";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Azkait Diagnostic Agent",
  description: "Sistema de diagnóstico inteligente",
  icons: {
    icon: "/azkait-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const keys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    "NEXT_PUBLIC_APP_URL",
  ] as const;
  const publicEnv = keys.reduce<Record<string, string | undefined>>((acc, k) => {
    const v = (process.env as Record<string, string | undefined>)[k];
    if (v !== undefined) acc[k] = v;
    return acc;
  }, {});
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${montserrat.variable} antialiased`}
      >
        <Script id="public-env" strategy="beforeInteractive">
          {`window.__ENV=${JSON.stringify(publicEnv)};`}
        </Script>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
