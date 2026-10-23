import React from "react"
import type { Metadata, Viewport } from "next"
import "./styles.css"

const siteTitle = "aika — Worth the wait"
const siteDescription =
  "aika is taking shape. Join the waitlist and be first to hear what comes next."
const favicon = "/aika-icon.svg"
const socialImage = "/og.png"

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
  title: siteTitle,
  description: siteDescription,
  applicationName: "aika",
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
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [socialImage],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div id="root" tabIndex={-1}>
          <main id="main-content">{children}</main>
        </div>
      </body>
    </html>
  )
}
