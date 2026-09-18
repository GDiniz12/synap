import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          borderRadius: '36px',
        }}
      >
        <svg
          viewBox="0 0 32 32"
          width="120"
          height="120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 16 3 L 27.25 9.5 L 27.25 22.5 L 16 29 L 4.75 22.5 L 4.75 9.5 Z"
            stroke="#ffffff"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 16 16 L 16 29 M 16 16 L 4.75 9.5 M 16 16 L 27.25 9.5"
            stroke="#ffffff"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M 16 3 L 16 10.28 M 27.25 9.5 L 20.95 13.14 M 27.25 22.5 L 20.95 18.86 M 16 29 L 16 21.72 M 4.75 22.5 L 11.05 18.86 M 4.75 9.5 L 11.05 13.14"
            stroke="#ffffff"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
          <path
            d="M 16 10.28 L 20.95 13.14 L 20.95 18.86 L 16 21.72 L 11.05 18.86 L 11.05 13.14 Z"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M 16 16 L 16 21.72 M 16 16 L 11.05 13.14 M 16 16 L 20.95 13.14"
            stroke="#ffffff"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
