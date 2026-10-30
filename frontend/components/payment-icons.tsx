// Brand badges for the accepted payment methods. Each one is a small
// inline badge sized for the footer strip — keeps the bundle tiny and
// avoids depending on external image hosts. Wordmarks are rendered as
// HTML text (not <text> inside SVG) so they always fall back to a
// system font instead of disappearing when the SVG font is missing.

import Image from 'next/image';

type BadgeProps = { className?: string };

const wrapperClass =
  'inline-flex items-center justify-center bg-white border border-border rounded-md h-7 min-w-[44px] px-2.5';

// Wordmarks need a Latin font even on AR pages — `dir="ltr"` keeps the
// letters in order and a sans-serif stack avoids the brand font.
const wordmarkStyle: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export function VisaBadge({ className }: BadgeProps) {
  return (
    <span className={`${wrapperClass} ${className ?? ''}`} aria-label="Visa">
      <span
        dir="ltr"
        className="text-[13px] font-black italic leading-none tracking-tight"
        style={{ ...wordmarkStyle, color: '#1A1F71' }}
      >
        VISA
      </span>
    </span>
  );
}

export function MastercardBadge({ className }: BadgeProps) {
  return (
    <span className={`${wrapperClass} ${className ?? ''}`} aria-label="Mastercard">
      <svg viewBox="0 0 36 22" className="h-4 w-auto" aria-hidden="true">
        <circle cx="13" cy="11" r="9" fill="#EB001B" />
        <circle cx="23" cy="11" r="9" fill="#F79E1B" fillOpacity="0.9" />
        <path
          d="M18 4.2a9 9 0 0 0 0 13.6 9 9 0 0 0 0-13.6z"
          fill="#FF5F00"
        />
      </svg>
    </span>
  );
}

export function ApplePayBadge({ className }: BadgeProps) {
  return (
    <span
      className={`${wrapperClass} ${className ?? ''} gap-0.5`}
      aria-label="Apple Pay"
    >
      <svg viewBox="0 0 14 16" className="h-3.5 w-auto" aria-hidden="true">
        <path
          fill="#000"
          d="M11.18 8.4c-.02-2.1 1.72-3.1 1.8-3.16-.98-1.44-2.5-1.64-3.04-1.66-1.3-.13-2.53.76-3.19.76-.66 0-1.68-.74-2.76-.72-1.42.02-2.73.83-3.46 2.1-1.48 2.56-.38 6.36 1.06 8.44.7 1.02 1.54 2.17 2.64 2.13 1.06-.04 1.46-.69 2.74-.69 1.28 0 1.64.69 2.76.66 1.14-.02 1.86-1.04 2.56-2.07.8-1.18 1.13-2.33 1.15-2.39-.02-.01-2.2-.85-2.26-3.39zM9.13 2.2c.58-.71.97-1.7.86-2.69-.83.04-1.85.56-2.45 1.27-.53.62-1 1.62-.87 2.6.92.07 1.87-.47 2.46-1.18z"
        />
      </svg>
      <span
        dir="ltr"
        className="text-[12px] font-bold leading-none tracking-tight text-black"
        style={wordmarkStyle}
      >
        Pay
      </span>
    </span>
  );
}

export function KnetBadge({ className }: BadgeProps) {
  // Official KNET artwork shipped at /public/brand/knet.png. Wrapped in
  // a white-bordered box matching the other payment badges so the row
  // reads as a single visual unit.
  return (
    <span className={`${wrapperClass} ${className ?? ''} p-1`} aria-label="KNET">
      <Image
        src="/brand/knet.png"
        alt="KNET"
        width={120}
        height={80}
        className="h-full w-auto object-contain"
        unoptimized
      />
    </span>
  );
}

export function DeemaBadge({ className }: BadgeProps) {
  // Deema wordmark (Kuwait BNPL). Shipped at /public/brand/deema.png.
  return (
    <span className={`${wrapperClass} ${className ?? ''} p-1`} aria-label="Deema">
      <Image
        src="/brand/deema.png"
        alt="Deema"
        width={120}
        height={80}
        className="h-full w-auto object-contain"
        unoptimized
      />
    </span>
  );
}

export function SamsungPayBadge({ className }: BadgeProps) {
  // Samsung Pay artwork at /public/brand/samsung-pay.png.
  return (
    <span
      className={`${wrapperClass} ${className ?? ''} p-1`}
      aria-label="Samsung Pay"
    >
      <Image
        src="/brand/samsung-pay.png"
        alt="Samsung Pay"
        width={120}
        height={80}
        className="h-full w-auto object-contain"
        unoptimized
      />
    </span>
  );
}

export function GooglePayBadge({ className }: BadgeProps) {
  // Google Pay artwork at /public/brand/google-pay.png.
  return (
    <span
      className={`${wrapperClass} ${className ?? ''} p-1`}
      aria-label="Google Pay"
    >
      <Image
        src="/brand/google-pay.png"
        alt="Google Pay"
        width={120}
        height={80}
        className="h-full w-auto object-contain"
        unoptimized
      />
    </span>
  );
}

export function PaymentBadges({ className }: BadgeProps) {
  return (
    <div
      dir="ltr"
      className={`flex items-center gap-2 flex-wrap ${className ?? ''}`}
      aria-label="Accepted payment methods"
    >
      <VisaBadge />
      <MastercardBadge />
      <KnetBadge />
      <ApplePayBadge />
      <GooglePayBadge />
      <SamsungPayBadge />
      <DeemaBadge />
    </div>
  );
}
