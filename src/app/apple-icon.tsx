import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
    width: 180,
    height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'black',
                }}
            >
                <svg
                    width="100"
                    height="100"
                    viewBox="0 0 24 24"
                    fill="#39FF14"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#39FF14" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        ),
        {
            ...size,
        }
    )
}
