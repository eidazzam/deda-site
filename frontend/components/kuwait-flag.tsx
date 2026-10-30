// Compact Kuwait flag mark used in the header strip to signal the
// brand's local identity at a glance. Inline SVG so it scales cleanly
// and never blocks on a CDN. Stripes from top to bottom: green, white,
// red, with the black hoist-side trapezoid on the start edge.

type Props = {
  className?: string;
};

export function KuwaitFlag({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 12"
      className={className}
      role="img"
      aria-label="Kuwait"
    >
      {/* Stripes */}
      <rect x="0" y="0" width="24" height="4" fill="#007a3d" />
      <rect x="0" y="4" width="24" height="4" fill="#ffffff" />
      <rect x="0" y="8" width="24" height="4" fill="#ce1126" />
      {/* Black hoist trapezoid — five-point chevron tapering to the
          centre of the flag's height. */}
      <polygon points="0,0 6,4 4,6 6,8 0,12" fill="#000000" />
    </svg>
  );
}
