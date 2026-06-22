export const dynamic = 'force-dynamic'
import './globals.css';
import type { Metadata } from 'next';
import { Inter, Karla, Figtree } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ExtensionTokenSync } from '@/components/ExtensionTokenSync';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const karla = Karla({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-karla' });
const figtree = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-figtree' });

export const metadata: Metadata = {
  title: 'Fetchh',
  description: 'Get a quick summary on any YouTube video.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${karla.variable} ${figtree.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* Anti-flash: apply dark class before React hydrates */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark') document.documentElement.classList.add('dark');
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body className="bg-background text-foreground m-0 p-0">
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          crossOrigin="anonymous"
        />
        <ThemeProvider>
          <ExtensionTokenSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}