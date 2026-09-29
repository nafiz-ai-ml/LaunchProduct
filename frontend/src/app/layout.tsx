import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import './globals.css';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { CommandPalette } from '@/components/search/CommandPalette';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TopProgressBar } from '@/components/layout/TopProgressBar';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LaunchProduct — High-Integrity Product Discovery & Growth Platform',
  description:
    'Discover, launch, and grow top SaaS applications, AI agents, and developer utilities with transparent rankings and verified traction.',
  keywords: [
    'product discovery',
    'saas launches',
    'ai agents',
    'developer tools',
    'product hunt alternative',
    'growth platform',
    'startup leaderboard',
  ],
  authors: [{ name: 'LaunchProduct Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://launchproduct.com'),
  alternates: {
    canonical: 'https://launchproduct.com',
  },
  openGraph: {
    title: 'LaunchProduct — High-Integrity Product Discovery & Growth Platform',
    description:
      'Discover, launch, and grow top SaaS applications, AI agents, and developer utilities with transparent rankings and verified traction.',
    url: 'https://launchproduct.com',
    siteName: 'LaunchProduct',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LaunchProduct — High-Integrity Product Discovery & Growth Platform',
    description:
      'Discover, launch, and grow top SaaS applications, AI agents, and developer utilities with transparent rankings and verified traction.',
    creator: '@launchproduct',
  },
  icons: {
    icon: [
      { url: '/brand/favicon/Favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/icon/Light%20Theme%20Icon%20Only.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-text-primary antialiased selection:bg-primary selection:text-white flex flex-col font-sans max-w-full w-full">
        <ThemeProvider>
          <Suspense fallback={null}>
            <TopProgressBar />
          </Suspense>
          <Navbar />
          <div className="flex-1 w-full max-w-full">
            {children}
          </div>
          <Footer />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}

