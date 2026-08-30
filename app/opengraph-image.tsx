import { ImageResponse } from 'next/og'

export const alt = 'Lagos-Ibadan train ticket alerts'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fafafa',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 4, color: '#8a8a8a' }}>
          LAGOS / IBADAN
        </div>
        <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2, marginTop: 24 }}>
          Know the moment a seat opens
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 32, fontSize: 30, color: '#a1a1a1' }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: '#4ade80',
              marginRight: 16,
            }}
          />
          Free email alerts when NRC tickets go on sale
        </div>
      </div>
    ),
    size
  )
}
