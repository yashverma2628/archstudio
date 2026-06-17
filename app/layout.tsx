import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'ArchStudio | Certificate Management',
  description: 'Premium course certificate management for architectural design mastery',
  generator: 'v0.app',
  icons: {
    icon: '/logo2.png',
    apple: '/logo2.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
