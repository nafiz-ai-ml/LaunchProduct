import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { CommandPalette } from '@/components/search/CommandPalette';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

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
      { url: '/brand/favicon/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/icon/app-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} overflow-x-hidden max-w-full`} suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-text-primary antialiased selection:bg-brand-primary selection:text-white flex flex-col font-sans overflow-x-hidden max-w-full w-full">
        <ThemeProvider>
          <Navbar />
          <div className="flex-1 w-full max-w-full overflow-x-hidden">
            {children}
          </div>
          <Footer />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
