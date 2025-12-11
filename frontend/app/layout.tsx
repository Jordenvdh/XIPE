import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: "XIPE Model - Cross Impact Performance Emissions",
  description: "The XIPE model estimates the effect shared mobility has on CO2 and air pollution emissions in a city or region.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="bg-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
