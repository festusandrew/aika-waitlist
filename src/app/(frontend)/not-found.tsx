import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "404 — Page Not Found | aika",
  description: "The page you're looking for doesn't exist or has been moved.",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.24em] text-[#c2a1ff]">
        [ AIKA / ERROR ]
      </p>
      <h1 className="font-mono text-4xl tracking-tight sm:text-5xl">Page Not Found</h1>
      <p className="mt-4 max-w-md text-[#c9c3d2]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        className="mt-8 inline-flex items-center gap-2 rounded border border-[#4b4259] bg-[#211a2b] px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-[#faf9fc] transition hover:border-[#c2a1ff] hover:text-[#c2a1ff]"
        href="/"
      >
        ← Back to Home
      </Link>
    </section>
  )
}
