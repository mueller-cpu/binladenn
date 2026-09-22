import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Bin Laden',
        short_name: 'Bin Laden',
        description: 'Ladesäule buchen',
        start_url: '/',
        display: 'standalone',
        background_color: '#060809',
        theme_color: '#060809',
        icons: [
            {
                src: '/icon',
                sizes: '32x32',
                type: 'image/png',
            },
            {
                src: '/apple-icon',
                sizes: '180x180',
                type: 'image/png',
            },
        ],
    }
}
