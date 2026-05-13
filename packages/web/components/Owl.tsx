export function Owl({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path
        d="M 100 12 L 64 4 Q 60 28, 60 40 Q 36 46, 24 70 Q 14 92, 18 124 Q 24 162, 60 182 Q 80 192, 100 192 Q 120 192, 140 182 Q 176 162, 182 124 Q 186 92, 176 70 Q 164 46, 140 40 Q 140 28, 136 4 L 100 12 Z"
        fill="#1A1F3A"
      />
      <circle cx="68" cy="98" r="30" fill="rgba(255,255,255,0.86)" />
      <circle cx="132" cy="98" r="30" fill="rgba(255,255,255,0.86)" />
      <circle cx="68" cy="98" r="18" fill="#3FE07A" />
      <circle cx="132" cy="98" r="18" fill="#3FE07A" />
      <circle cx="68" cy="98" r="7" fill="#1A1F3A" />
      <circle cx="132" cy="98" r="7" fill="#1A1F3A" />
      <circle cx="73" cy="93" r="3" fill="rgba(255,255,255,0.85)" />
      <circle cx="137" cy="93" r="3" fill="rgba(255,255,255,0.85)" />
      <path d="M 100 122 L 90 138 Q 100 144, 110 138 Z" fill="#3FE07A" />
    </svg>
  );
}
