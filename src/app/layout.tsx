import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { PwaRegister } from '@/components/pwa-register';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['200','600'],
  display: 'swap',
  variable: '--font-montserrat'
});

export const metadata: Metadata = {
  title: 'GeekoPlay',
  description: 'A comunidade geek que você merecia.',
  applicationName: 'GeekoPlay',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'GeekoPlay',
    statusBarStyle: 'black-translucent'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#101319'
};

const themeInit = `(function(){try{var t=localStorage.getItem('geekoplay-theme');if(t==='light'){document.documentElement.classList.add('light');document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light'}else{document.documentElement.classList.add('dark');document.documentElement.dataset.theme='dark';document.documentElement.style.colorScheme='dark'}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={montserrat.variable}>
      <head><script dangerouslySetInnerHTML={{__html:themeInit}}/></head>
      <body><PwaRegister/>{children}</body>
    </html>
  );
}
