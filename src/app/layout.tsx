import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GeekoPlay',
  description: 'A comunidade geek que você merecia.'
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:themeInit}}/></head>
      <body>{children}</body>
    </html>
  );
}
