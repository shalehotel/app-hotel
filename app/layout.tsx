import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from '@/components/ui/sonner'
import { getHotelConfig } from '@/lib/actions/configuracion'
import { ConfigProvider } from '@/components/providers/config-provider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel App - Sistema de Gestión Hotelera",
  description: "Sistema completo de gestión hotelera con Next.js y Supabase",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getHotelConfig()

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ConfigProvider initialConfig={config}>
          {children}
          <Toaster position="top-right" richColors />
        </ConfigProvider>
      </body>
    </html>
  );
}

