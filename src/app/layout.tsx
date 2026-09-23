import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { PwaRegister } from '@/components/pwa-register';
import { ThemeToggle } from '@/components/theme-toggle';
import { GlobalPhotoSourceGuard } from '@/components/global-photo-source-guard';
import { GlobalMediaViewer } from '@/components/global-media-viewer';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['200','400','600'],
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
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/icon-192.png'
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
      <body><PwaRegister/><ThemeToggle/><GlobalPhotoSourceGuard/><GlobalMediaViewer/>{children}</body>
    </html>
  );
}
