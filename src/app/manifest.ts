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
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ]
  };
}
