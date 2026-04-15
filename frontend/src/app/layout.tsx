import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';
import { MainNav } from '@/components/main-nav';
import { Header } from '@/components/header';
import { NoStorePrompt } from '@/components/stores';
import { AssetRecoveryListener } from '@/components/asset-recovery-listener';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Quản lý bán hàng',
  description:
    'Quản lý hàng tồn kho, bán hàng và công nợ khách hàng của bạn với thông tin chi tiết do AI hỗ trợ.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          ptSans.variable
        )}
      >
        <Providers>
          <AssetRecoveryListener />
          <div className="flex min-h-screen">
            <MainNav />
            <div className="flex-1 flex flex-col p-6 gap-6 min-w-0">
              <Header />
              <main className="flex-1 overflow-y-auto">
                <NoStorePrompt>{children}</NoStorePrompt>
              </main>
            </div>
          </div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
