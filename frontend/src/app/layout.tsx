import MeshProviderWrapper from '@/components/MeshProviderWrapper';
import type { Metadata } from "next";
import { fontSans, fontHeading } from "@/styles/fonts";
import { Providers } from "@/providers";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://use.typekit.net/grm4afc.css" rel="stylesheet" />
      </head>
      <body
        className={`${fontSans.variable} ${fontHeading.variable} font-sans antialiased`}>
          <MeshProviderWrapper>
            {children}
          </MeshProviderWrapper>
      </body>
    </html>
  );
}
