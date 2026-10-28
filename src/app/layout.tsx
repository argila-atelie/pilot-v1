import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700", "900"], variable: '--font-playfair' });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: '--font-sans' });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "Argila — Gestão de Ateliê",
  description: "Gestão de produção, estoque, vendas e finanças para ateliês de cerâmica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* Extensões como Grammarly adicionam atributos ao <body> antes da hidratação; só os atributos desta tag são ignorados. */}
      <body
        className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
