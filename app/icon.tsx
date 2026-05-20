import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#192916',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 0,
          paddingBottom: 1,
        }}
      >
        <span
          style={{
            color: '#F5F1EA',
            fontSize: 11,
            fontWeight: 300,
            letterSpacing: '-0.04em',
            fontFamily: 'Georgia, serif',
            lineHeight: 1,
          }}
        >
          NL
        </span>
        <span
          style={{
            color: '#B8593D',
            fontSize: 15,
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
            lineHeight: 1,
            marginTop: 3,
          }}
        >
          .
        </span>
      </div>
    ),
    { ...size }
  );
}
