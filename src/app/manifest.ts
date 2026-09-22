import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GeekoPlay',
    short_name: 'GeekoPlay',
    description: 'A comunidade geek que você merecia.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#101319',
    theme_color: '#f97316',
    lang: 'pt-BR',
    categories: ['social', 'entertainment', 'games'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
