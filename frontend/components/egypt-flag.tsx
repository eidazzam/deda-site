// Compact Egypt flag used in the header announcement strip. Three
// horizontal stripes — red (top), white (middle), black (bottom) —
// per the official spec. Inline SVG so it scales cleanly and never
// blocks on a CDN; eagle emblem is skipped at this size (14-20px tall)
// because it reduces to a muddy blob that reads as noise rather than
// identity.

type Props = {
  className?: string;
};

export function EgyptFlag({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 12"
      className={className}
      role="img"
      aria-label="Egypt"
    >
      <rect x="0" y="0" width="24" height="4" fill="#ce1126" />
      <rect x="0" y="4" width="24" height="4" fill="#ffffff" />
      <rect x="0" y="8" width="24" height="4" fill="#000000" />
    </svg>
  );
}
