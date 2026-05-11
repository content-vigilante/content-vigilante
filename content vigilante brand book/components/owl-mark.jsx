/* ============================================================
   Content Vigilante — Owl Mark
   Reusable React component. All colors are CSS variables so the
   mark inherits whatever theme is active (light/dark/mono).
   ============================================================ */

/**
 * <OwlMark size={64} variant="full" />
 * variants:
 *   full      — primary navy + green-eye mark (default)
 *   mono      — single-color (defaults to currentColor / inherits)
 *   reverse   — paper-on-ink (used on dark backgrounds; the body is
 *               cream and the eyes are still vivid green)
 *   line      — outline only (small UI / favicon @ 16-24px)
 *   stamp     — sits inside a circular badge with orbital text
 */
function OwlMark({ size = 64, variant = 'full', accent, body, ring, eye, blink = false, style }) {
  // Resolve theme colors (variables -> hex fallbacks)
  const C = {
    body:   body   || (variant === 'mono' || variant === 'line' ? 'currentColor' :
                       variant === 'reverse' ? 'var(--cv-paper, #FFFFFF)' : 'var(--cv-ink, #1A1F3A)'),
    accent: accent || 'var(--cv-green, #3FE07A)',
    ring:   ring   || (variant === 'reverse' ? 'rgba(26,31,58,0.18)'
                                              : 'rgba(255,255,255,0.86)'),
    eye:    eye    || (variant === 'mono' || variant === 'line' ? 'currentColor'
                                                                 : 'var(--cv-ink, #1A1F3A)'),
  };

  // 200x200 viewBox.
  // Owl head silhouette: rounded, with two pointy ear tufts at the top.
  // Built with a single closed path so it scales crisply.
  const HEAD_PATH = "M 100 12 L 64 4 Q 60 28, 60 40 Q 36 46, 24 70 Q 14 92, 18 124 Q 24 162, 60 182 Q 80 192, 100 192 Q 120 192, 140 182 Q 176 162, 182 124 Q 186 92, 176 70 Q 164 46, 140 40 Q 140 28, 136 4 L 100 12 Z";

  // The little 'cap' between the tufts (lighter shape on top of head).
  // Adds depth — used in 'full' variant.
  const CAP_PATH = "M 100 22 Q 80 26, 70 44 Q 100 36, 130 44 Q 120 26, 100 22 Z";

  const isLine = variant === 'line';
  const isFull = variant === 'full' || variant === 'reverse';

  return (
    <svg width={size} height={size} viewBox="0 0 200 200"
         style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
         aria-label="Content Vigilante owl">
      {/* Head silhouette */}
      {isLine ? (
        <path d={HEAD_PATH} fill="none" stroke={C.body} strokeWidth="6" strokeLinejoin="round"/>
      ) : (
        <path d={HEAD_PATH} fill={C.body}/>
      )}

      {/* Soft cap shading on full variants */}
      {isFull && variant === 'full' && (
        <path d={CAP_PATH} fill="rgba(255,255,255,0.06)"/>
      )}

      {/* Eyes — outer ring (eyebrow ridge) */}
      <g>
        {/* Left eye */}
        <circle cx="68" cy="98" r="30" fill={isLine ? 'none' : C.ring}
                stroke={isLine ? C.body : 'none'} strokeWidth={isLine ? 6 : 0}/>
        {/* Right eye */}
        <circle cx="132" cy="98" r="30" fill={isLine ? 'none' : C.ring}
                stroke={isLine ? C.body : 'none'} strokeWidth={isLine ? 6 : 0}/>
      </g>

      {/* Eye irises — the vigilante green */}
      {!isLine && (
        <g>
          <g className={blink ? 'cv-eye-blink' : ''} style={{ transformOrigin: '68px 98px' }}>
            <circle cx="68" cy="98" r="18" fill={C.accent}/>
            {/* Pupil */}
            <circle cx="68" cy="98" r="7" fill={C.eye}/>
            {/* Eye highlight */}
            <circle cx="73" cy="93" r="3" fill="rgba(255,255,255,0.85)"/>
          </g>
          <g className={blink ? 'cv-eye-blink' : ''} style={{ transformOrigin: '132px 98px' }}>
            <circle cx="132" cy="98" r="18" fill={C.accent}/>
            <circle cx="132" cy="98" r="7" fill={C.eye}/>
            <circle cx="137" cy="93" r="3" fill="rgba(255,255,255,0.85)"/>
          </g>
        </g>
      )}

      {/* Beak — small downward triangle between the eyes */}
      {!isLine && (
        <path d="M 100 122 L 90 138 Q 100 144, 110 138 Z" fill={C.accent}/>
      )}
      {isLine && (
        <path d="M 100 122 L 90 138 Q 100 144, 110 138 Z" fill="none" stroke={C.body} strokeWidth="5" strokeLinejoin="round"/>
      )}

      {/* Subtle chest tuft — center bottom v-cut for depth */}
      {isFull && (
        <path d="M 100 188 L 92 168 Q 100 174, 108 168 Z" fill="rgba(0,0,0,0.18)"/>
      )}
    </svg>
  );
}

/* ============================================================
   Wordmark + Lockups
   ============================================================ */
function Wordmark({ size = 36, color, style }) {
  return (
    <span style={{
      fontFamily: 'var(--cv-display)',
      fontWeight: 700,
      fontSize: size,
      letterSpacing: '-0.022em',
      lineHeight: 1,
      color: color || 'var(--cv-ink)',
      whiteSpace: 'nowrap',
      ...style
    }}>
      <span style={{ fontWeight: 700 }}>Content</span>
      {' '}
      <span style={{ fontWeight: 500 }}>Vigilante</span>
    </span>
  );
}

function Lockup({ size = 36, color, gap, blink, style }) {
  const owlSize = Math.round(size * 1.6);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: gap || size * 0.45, ...style }}>
      <OwlMark size={owlSize} blink={blink}/>
      <Wordmark size={size} color={color}/>
    </span>
  );
}

function LockupStacked({ size = 36, color, blink, slogan = true, style }) {
  const owlSize = Math.round(size * 2.2);
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.4, ...style }}>
      <OwlMark size={owlSize} blink={blink}/>
      <Wordmark size={size} color={color}/>
      {slogan && (
        <span style={{
          fontFamily: 'var(--cv-sans)',
          fontWeight: 500,
          fontSize: size * 0.42,
          letterSpacing: '-0.005em',
          color: color || 'var(--cv-stone-500)',
          whiteSpace: 'nowrap'
        }}>
          Stop shipping off-brand content.
        </span>
      )}
    </span>
  );
}

/* ============================================================
   The Seal — circular badge with orbital text
   ============================================================ */
function OwlSeal({ size = 200, ink, accent, paper, style }) {
  const I = ink    || 'var(--cv-ink, #1A1F3A)';
  const A = accent || 'var(--cv-green, #3FE07A)';
  const P = paper  || 'var(--cv-paper, #FFFFFF)';
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" style={{ display: 'inline-block', ...style }}>
      <defs>
        <path id="orbitT" d="M 120,120 m -94,0 a 94,94 0 1,1 188,0" />
        <path id="orbitB" d="M 120,120 m 94,0 a 94,94 0 1,1 -188,0" />
      </defs>
      <circle cx="120" cy="120" r="112" fill={P} stroke={I} strokeWidth="2"/>
      <circle cx="120" cy="120" r="100" fill="none" stroke={I} strokeWidth="0.75"/>
      <circle cx="120" cy="120" r="78" fill="none" stroke={I} strokeWidth="1" strokeDasharray="1.5 4"/>
      <text fontSize="9.5" letterSpacing="3" fill={I} style={{ fontFamily: 'var(--cv-mono)', fontWeight: 600 }}>
        <textPath href="#orbitT" startOffset="50%" textAnchor="middle">CONTENT • VIGILANTE • OFFICE OF</textPath>
      </text>
      <text fontSize="9.5" letterSpacing="3" fill={I} style={{ fontFamily: 'var(--cv-mono)', fontWeight: 600 }}>
        <textPath href="#orbitB" startOffset="50%" textAnchor="middle">EST. MMXXVI • BRAND ENFORCEMENT</textPath>
      </text>
      {/* small star pips */}
      <circle cx="20"  cy="120" r="2" fill={I}/>
      <circle cx="220" cy="120" r="2" fill={I}/>
      {/* centered owl in seal */}
      <g transform="translate(53 53) scale(0.67)">
        <path d="M 100 12 L 64 4 Q 60 28, 60 40 Q 36 46, 24 70 Q 14 92, 18 124 Q 24 162, 60 182 Q 80 192, 100 192 Q 120 192, 140 182 Q 176 162, 182 124 Q 186 92, 176 70 Q 164 46, 140 40 Q 140 28, 136 4 L 100 12 Z" fill={I}/>
        <circle cx="68" cy="98" r="30" fill="rgba(255,255,255,0.86)"/>
        <circle cx="132" cy="98" r="30" fill="rgba(255,255,255,0.86)"/>
        <circle cx="68" cy="98" r="18" fill={A}/>
        <circle cx="132" cy="98" r="18" fill={A}/>
        <circle cx="68" cy="98" r="7" fill={I}/>
        <circle cx="132" cy="98" r="7" fill={I}/>
        <path d="M 100 122 L 90 138 Q 100 144, 110 138 Z" fill={A}/>
      </g>
    </svg>
  );
}

/* Make available to other Babel scripts */
Object.assign(window, { OwlMark, Wordmark, Lockup, LockupStacked, OwlSeal });
