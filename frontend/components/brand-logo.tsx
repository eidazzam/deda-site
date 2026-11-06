// Temporary brand mark. Stays inline as an SVG so it ships with the
// HTML, never breaks on cold cache, and respects the Arabic-first
// hierarchy: the Arabic name leads, the Latin transliteration sits
// under it as a quiet identifier line in gold. Replace this component
// once the proper logo file lands — the Header just swaps the import.

type Props = {
  className?: string;
  // When `compact`, drops the Latin sub-line — useful in tight headers
  // or as a favicon-sized mark.
  compact?: boolean;
};

export function BrandLogo({ className, compact = false }: Props) {
  return (
    <svg
      viewBox="0 0 280 90"
      role="img"
      aria-label="Deda"
      className={className}
    >
      {/* Arabic display — El Messiri via the CSS variable on <html>. */}
      <text
        x="140"
        y={compact ? '60' : '50'}
        textAnchor="middle"
        fill="currentColor"
        style={{
          fontFamily: 'var(--font-ar-display), system-ui, sans-serif',
          fontSize: '44px',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        ديدا
      </text>
      {compact ? null : (
        <>
          {/* Hairline separator in the brand gold. */}
          <line x1="110" y1="62" x2="170" y2="62" stroke="#c9a87c" strokeWidth="0.6" />
          {/* Latin identifier — Inter, wide tracking, gold. */}
          <text
            x="140"
            y="78"
            textAnchor="middle"
            fill="#c9a87c"
            style={{
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.32em',
            }}
          >
            DEDA
          </text>
        </>
      )}
    </svg>
  );
}
