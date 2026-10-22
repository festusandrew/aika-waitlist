import React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { BodyCustomCode, renderHeadCustomCode } from "@/lib/make-custom-code"
import {
  makeSiteSettings,
  sanitizeHtmlAttribute,
} from "@/lib/make-site-settings"
import "./styles.css"

const defaultTitle = "aika — Worth the wait"
const title = makeSiteSettings.title ?? defaultTitle
const description =
  makeSiteSettings.description ??
  "aika is taking shape. Join the waitlist and be first to hear what comes next."
const favicon = makeSiteSettings.icons?.icon ?? "/aika-icon.svg"
const socialImage = makeSiteSettings.openGraph?.image ?? "/og.png"
const googleAnalyticsId = sanitizeHtmlAttribute(
  makeSiteSettings.analytics?.googleAnalyticsId,
)

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15101d",
  colorScheme: "dark",
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title,
  description,
  applicationName: "aika",
  robots:
    makeSiteSettings.robots?.index === false
      ? { follow: false, index: false }
      : undefined,
  icons: {
    icon: favicon,
    shortcut: favicon,
    apple: favicon,
  },
  openGraph: {
    type: "website",
    siteName: "aika",
    locale: "en_US",
    url: "/",
    title,
    description,
    images: socialImage
      ? [{ url: socialImage, width: 1200, height: 630, alt: title }]
      : undefined,
  },
  twitter: socialImage
    ? {
        card: "summary_large_image",
        title,
        description,
        images: [socialImage],
      }
    : undefined,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const language = sanitizeHtmlAttribute(makeSiteSettings.language) || "en"
  const addBypassLinks = makeSiteSettings.accessibility?.addBypassLinks === true
  const customScripts = makeSiteSettings.customScripts

  return (
    <html lang={language}>
      <head>
        <link rel="preconnect" href="https://static.figma.com" crossOrigin="" />
        {renderHeadCustomCode(customScripts?.headStart, "head-start")}
        {renderHeadCustomCode(customScripts?.headEnd, "head-end")}
      </head>
      <body className="min-h-screen antialiased">
        <BodyCustomCode html={customScripts?.bodyStart} />
        {addBypassLinks && (
          <a className="figma-bypass-link" href="#main-content">
            Skip to content
          </a>
        )}
        <div id="root" tabIndex={-1}>
          <main id="main-content">
            {children}
          </main>
        </div>
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="figma-google-analytics" strategy="afterInteractive">
              {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(googleAnalyticsId)});
`}
            </Script>
          </>
        )}
        <BodyCustomCode html={customScripts?.bodyEnd} />
      </body>
    </html>
  )
}
