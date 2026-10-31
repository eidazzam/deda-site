'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from './icon';

import { api } from '@/lib/api/client';
import type { SiteConfig } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function Footer({
  locale,
  dict,
  config: initialConfig,
}: {
  locale: Locale;
  dict: Dictionary;
  config?: SiteConfig | null;
}) {
  const isAR = locale === 'ar';
  const prefix = `/${locale}`;

  // Cloudflare Pages edge can't reach api.dedawomenswear.shop from inside the
  // same zone, so the SSR config from the layout is often null. Pull
  // it again from the browser where CORS is wired up.
  const [config, setConfig] = useState<SiteConfig | null>(initialConfig ?? null);

  useEffect(() => {
    let cancelled = false;
    api.siteConfig
      .get({ cache: 'no-store' })
      .then((res) => {
        if (!cancelled) setConfig(res);
      })
      .catch(() => {
        // Keep whatever SSR gave us (likely null) — better to hide the
        // socials than to render broken links.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Baked-in Deda contact defaults so the footer still renders a full
  // socials row before the admin fills siteConfig in (or if the
  // browser-side fetch quietly fails). Admin overrides take priority.
  const DEDA_WHATSAPP = '+201200724809';
  const DEDA_FACEBOOK = 'https://www.facebook.com/dwomenswear/';
  const DEDA_INSTAGRAM = 'https://www.instagram.com/dwomenswear';

  // wa.me wants the number without the leading + and without spaces/dashes.
  const whatsappRaw = config?.whatsappNumber ?? DEDA_WHATSAPP;
  const whatsappHref = `https://wa.me/${whatsappRaw.replace(/[^0-9]/g, '')}`;

  const socials: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      href: whatsappHref,
      label: 'WhatsApp',
      icon: WhatsAppIcon,
    },
    {
      href: config?.instagramUrl ?? DEDA_INSTAGRAM,
      label: 'Instagram',
      icon: InstagramIcon,
    },
    config?.tiktokUrl && {
      href: config.tiktokUrl,
      label: 'TikTok',
      icon: TikTokIcon,
    },
    {
      href: config?.facebookUrl ?? DEDA_FACEBOOK,
      label: 'Facebook',
      icon: FacebookIcon,
    },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;

  return (
    <footer className="border-t border-border mt-24 lg:mt-32 bg-bg">
      <div className="max-w-page mx-auto px-6 lg:px-10 py-14 grid gap-10 md:grid-cols-5">
        <div>
          <div className="font-display text-3xl mb-3">{dict.brand}</div>
          <p className="text-sm text-muted leading-relaxed">
            {isAR
              ? 'عبايات حديثة بحرفية متّزنة، من مصر.'
              : 'Modern abayas with restrained craft, from Egypt.'}
          </p>
        </div>

        <div>
          <div className="text-[11px] tracking-widest uppercase text-muted mb-4">
            {isAR ? 'تسوّقي' : 'Shop'}
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="link-underline" href={`${prefix}/shop/all`}>
                {dict.shopCollection}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/about`}>
                {dict.about}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/wishlist`}>
                {dict.wishlist}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/cart`}>
                {dict.cart}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] tracking-widest uppercase text-muted mb-4">
            {isAR ? 'الحساب' : 'Account'}
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="link-underline" href={`${prefix}/about`}>
                {dict.about}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/wishlist`}>
                {dict.wishlist}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/cart`}>
                {dict.cart}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/terms`}>
                {isAR ? 'الشروط والأحكام' : 'Terms & Conditions'}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/returns`}>
                {isAR ? 'سياسة الاسترجاع' : 'Returns & Refunds'}
              </Link>
            </li>
            <li>
              <Link className="link-underline" href={`${prefix}/privacy`}>
                {isAR ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] tracking-widest uppercase text-muted mb-4">
            {isAR ? 'تواصل' : 'Contact'}
          </div>
          <p className="text-sm text-muted leading-relaxed mb-4">
            {isAR
              ? 'توصيل إلى جميع محافظات مصر وإلى كل الوطن العربى. دفع آمن.'
              : 'Delivery across Egypt. Secure payment.'}
          </p>
          {socials.length > 0 ? (
            <div className="flex items-center gap-4">
              {socials.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-muted hover:text-accent transition-colors"
                >
                  <Icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {/* QR column — click the code to download the PNG so a visitor
            can print it or share the link out. Same asset that goes on
            the printed business cards; keeping them identical means the
            brand mark on the site matches what customers scan offline. */}
        <div className={`flex flex-col ${isAR ? 'md:items-end' : 'md:items-start'} items-center gap-3`}>
          <div className="text-[11px] tracking-widest uppercase text-muted">
            {isAR ? 'زوروا موقعنا' : 'Visit us'}
          </div>
          <a
            href="/brand/qr-code.png"
            download="deda-qr-code.png"
            aria-label={isAR ? 'تحميل رمز QR' : 'Download QR code'}
            className="block p-2 bg-bg border border-border hover:border-accent transition-colors group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/qr-code.svg"
              alt={isAR ? 'رمز QR لموقع ديدا' : 'Deda site QR code'}
              width={100}
              height={100}
              className="w-[100px] h-[100px]"
            />
          </a>
          <span className="text-[10px] text-muted text-center">
            {isAR ? 'امسحي للزيارة' : 'Scan to visit'}
          </span>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="max-w-page mx-auto px-6 lg:px-10 py-5 text-[11px] tracking-widest uppercase text-muted text-center">
          © {new Date().getFullYear()} {dict.brand} ·{' '}
          {isAR ? 'كل الحقوق محفوظة' : 'All rights reserved'}
        </div>
      </div>
    </footer>
  );
}
