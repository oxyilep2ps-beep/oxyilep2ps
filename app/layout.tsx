import type { Metadata } from 'next';
import './globals.css';
import { syne, inter } from '@/lib/fonts';
import { ThemeProvider } from '@/components/theme-provider';
import { NavigationLoadingProvider } from '@/components/navigation-loading-provider';
import { SiteShell } from '@/components/site-shell';
import { PremiumLiquidBackground } from '@/components/premium-liquid-background';
import { ClickPaperBlast } from '@/components/click-paper-blast';
import { OliverBot } from '@/components/oliver/oliver-bot';

export const metadata: Metadata = {
  title: 'Oxyile — P2P Lending & Investment',
  description: 'A polished peer-to-peer lending and investment platform for verified borrowers and investors.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.className} ${inter.className}`} suppressHydrationWarning>
      <body className="bg-transparent">
        <ThemeProvider>
          <NavigationLoadingProvider>
            <PremiumLiquidBackground />
            <ClickPaperBlast />
            <SiteShell>{children}</SiteShell>
            <OliverBot />
          </NavigationLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}