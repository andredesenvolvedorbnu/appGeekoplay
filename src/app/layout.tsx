import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GeekoPlay',
  description: 'A comunidade geek que você merecia.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
