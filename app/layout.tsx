
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wicar — Uber dos Lava-jatos",
  description: "Lava-jato sob demanda com parceiros no mapa ou em casa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
            <img src="/wicar-logo.svg" alt="Wicar" className="h-6" />
            <span className="font-semibold text-[#0B132B]">Wicar</span>
            <span className="ml-auto text-xs text-gray-500">Beta</span>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
