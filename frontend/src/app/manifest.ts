import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tesseract',
    short_name: 'Tesseract',
    description: 'A comprehensive study tool with notes, graph visualization, canvas, and flashcards',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#111113',
    theme_color: '#111113',
    categories: ['education', 'productivity', 'utilities'],
    icons: [
      {
        src: '/tesseract-logo-256.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/tesseract-logo-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
