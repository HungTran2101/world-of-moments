import { ErrorProvider } from "@/components/shared/ErrorProvider";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Lemonada, Mitr, Geist } from "next/font/google";
import "../styles/import.scss";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogMotionProvider } from "@/components/ui/dialog";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const lemonada = Lemonada({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lemonada",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const mitr = Mitr({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mitr",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  const meta = messages.meta as { title: string; description: string };
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://dearworld.space"),
    title: meta.title,
    applicationName: "Dear World",
    description: meta.description,
    openGraph: {
      siteName: "Dear World",
      title: meta.title,
      description: meta.description,
      type: "website",
      images: [
        {
          url: "/favicon/metadata-image.png?v=dear-world",
          width: 2169,
          height: 725,
          alt: meta.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [{ url: "/favicon/metadata-image.png?v=dear-world", alt: meta.title }],
    },
    icons: {
      icon: [
        { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/favicon/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const locale = await getLocale();
  const messages = await getMessages();

  // Cho phep test `app/global-error.tsx` bang query param trong moi truong dev.
  if (
    process.env.NODE_ENV === "development" &&
    requestHeaders.get("x-test-error") === "global"
  ) {
    throw new Error("Dev global error test");
  }

  return (
    <html lang={locale} className={cn("font-sans", geist.variable)}>
      <body className={cn(mitr.variable, lemonada.variable)}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DialogMotionProvider>
            <ErrorProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </ErrorProvider>
          </DialogMotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
