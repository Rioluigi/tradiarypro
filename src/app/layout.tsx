import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tradiary — Automated Trading Journal",
  description:
    "Sistem informasi jurnal perdagangan otomatis yang menyinkronkan data transaksi langsung dari MetaTrader 5. Track, analyze, and improve your trading performance.",
  keywords: ["trading journal", "MetaTrader 5", "MT5", "trading analytics", "automated journal"],
  authors: [{ name: "Rio Luigi Del Niery" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

