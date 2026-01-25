import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StarfieldBackground from "@/components/ui/StarfieldBackground";
import Footer from "@/components/layout/Footer";
import DemoBanner from "@/components/ui/DemoBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LumenPay | Reimagining UPI on Stellar",
  description: "Clean, fast, calm, powerful, and invisible Web3 payments.",
  icons: {
    icon: "/assets/logo.png", 
    apple: "/assets/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DemoBanner />
        <StarfieldBackground />
        <main className="min-h-screen relative z-10 text-white pb-24 md:pb-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
