export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? "compact" : ""}`} aria-hidden="true">
      <svg className="brand-mark" viewBox="0 0 64 64" role="img">
        <path d="M12 19 5 8l16 6A28 28 0 0 1 32 12a28 28 0 0 1 11 2L59 8l-7 11a25 25 0 0 1 3 12c0 15-10 25-23 25S9 46 9 31a25 25 0 0 1 3-12Z" fill="currentColor" opacity=".16"/>
        <path d="M13 20 7 10l15 6M51 20l6-10-15 6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 29c5-6 10-8 16-8s11 2 16 8c-4 11-9 17-16 17S20 40 16 29Z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round"/>
        <path d="M17 28c5 0 10 2 15 7 5-5 10-7 15-7M24 31l5 3-5 3-5-3 5-3Zm16 0 5 3-5 3-5-3 5-3Z" fill="currentColor"/>
        <path d="m29 41 3 2 3-2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <span className="brand-signal" />
    </span>
  );
}
