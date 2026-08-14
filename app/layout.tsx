import type { Metadata, Viewport } from 'next';
import './globals.css';
import { syne, inter, caveat } from '@/lib/fonts';
import { ThemeProvider } from '@/components/theme-provider';
import { NavigationLoadingProvider } from '@/components/navigation-loading-provider';
import { SiteShell } from '@/components/site-shell';
import { GlobalThemeBackground } from '@/components/site/global-theme-background';
import { ClickCrackerBlast } from '@/components/ui/ClickCrackerBlast';
import { OliverBot } from '@/components/oliver/oliver-bot';
import { PwaRegister } from '@/components/pwa/PwaRegister';

export const metadata: Metadata = {
  title: 'Oxyile — P2P Lending & Investment',
  description: 'A polished peer-to-peer lending and investment platform for verified borrowers and investors.',
  manifest: '/manifest.json',
  applicationName: 'Oxyile',
  appleWebApp: {
    capable: true,
    title: 'Oxyile',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.className} ${inter.className} ${caveat.variable}`} suppressHydrationWarning>
      <body className="bg-transparent">
        <ThemeProvider>
          <NavigationLoadingProvider>
            <GlobalThemeBackground />
            <ClickCrackerBlast />
            <SiteShell>{children}</SiteShell>
            <OliverBot />
            <PwaRegister />
          </NavigationLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}