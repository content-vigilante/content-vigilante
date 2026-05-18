import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Content Vigilante — the local-first marketing operating system';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F4EEE3',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            background: '#1A1F3A',
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3FE07A',
            fontWeight: 700,
          }}
        >
          CV
        </div>
        <div
          style={{
            letterSpacing: 6,
            color: '#8A8270',
            fontSize: 20,
            textTransform: 'uppercase',
          }}
        >
          Content Vigilante · v1.2
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            color: '#1A1F3A',
            fontSize: 110,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: -2,
          }}
        >
          Stop shipping
        </div>
        <div
          style={{
            color: '#1F8A4C',
            fontSize: 110,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: -2,
          }}
        >
          off-brand content.
        </div>
        <div style={{ color: '#5E5848', fontSize: 28, marginTop: 28, maxWidth: 900 }}>
          The local-first marketing OS. Calendar, Studio, Brand Guardrails, Analytics, Pipeline.
          Your data stays yours.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#8A8270',
          fontSize: 18,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        <span>Open Source · MIT</span>
        <span>contentvigilante.com</span>
      </div>
    </div>,
    size,
  );
}
