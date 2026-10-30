'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { GlobeIcon } from '@/components/icon';
import { adminApi } from '@/lib/admin/api';
import { clearAdminSession, getAdminUsername } from '@/lib/admin/auth';
import { useAdminI18n } from '@/lib/admin/i18n';

type NavItem = {
  href: string;
  labelKey:
    | 'sidebar.dashboard'
    | 'sidebar.orders'
    | 'sidebar.products'
    | 'sidebar.governorates'
    | 'sidebar.heroSlides'
    | 'sidebar.categoryImages'
    | 'sidebar.settings';
  match: (p: string) => boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', labelKey: 'sidebar.dashboard', match: (p) => p === '/admin' },
  {
    href: '/admin/orders',
    labelKey: 'sidebar.orders',
    match: (p) => p.startsWith('/admin/orders'),
    badgeKey: 'orders',
  },
  {
  },
  {
    href: '/admin/products',
    labelKey: 'sidebar.products',
    match: (p) => p.startsWith('/admin/products'),
  },
  {
  },
  {
    href: '/admin/governorates',
    labelKey: 'sidebar.governorates',
    match: (p) => p.startsWith('/admin/governorates'),
  },
  {
  },
  {
    labelKey: 'sidebar.heroSlides',
  },
  {
  },
  {
    href: '/admin/settings',
    labelKey: 'sidebar.settings',
    match: (p) => p.startsWith('/admin/settings'),
  },
];

const POLL_INTERVAL_MS = 30_000;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useAdminI18n();
  const [username, setUsername] = useState<string | null>(null);
    orders: 0,
  });

  // Read the logged-in username from localStorage once on mount.
  useEffect(() => {
    setUsername(getAdminUsername());
  }, []);

  // cheap (single SQL count) so 30s is fine.
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const [o, l] = await Promise.all([
          adminApi.orders.unreadCount(),
        ]);
      } catch {
        // Silent — 401s already redirect us out, anything else is noise.
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const onLogout = () => {
    clearAdminSession();
    router.push('/admin/login');
  };

  // The active-link border lives on the *start* edge in both directions.
  // Tailwind's RTL-aware utilities take care of swapping border-l for
  // border-r when dir="rtl" is set on the wrapping <aside>.
  const startBorder = locale === 'ar' ? 'border-r-2' : 'border-l-2';

  return (
    <aside
      className={`w-60 shrink-0 ${
        locale === 'ar' ? 'border-l border-border' : 'border-r border-border'
      } bg-bg min-h-screen flex flex-col`}
    >
      <div className="px-6 py-6 border-b border-border">
        {/* Same brand mark as the storefront header — committed to the
            repo at frontend/public/brand/logo.png so both Cloudflare Pages
            and the VPS Next.js serve it directly without round-tripping
            to the API uploads volume. */}
        <Image
          src="/brand/logo.png"
          alt="Deda"
          width={320}
          height={320}
          priority
          className="h-40 w-auto object-contain"
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-[10px] tracking-widest uppercase text-muted">
            {t('common.admin')}
          </div>
          <button
            type="button"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-muted hover:text-ink transition-colors"
            aria-label="Toggle language"
          >
            <GlobeIcon className="w-3.5 h-3.5" />
            <span>{locale === 'ar' ? 'EN' : 'AR'}</span>
          </button>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {NAV.map((n) => {
          const active = n.match(pathname);
          const badge = n.badgeKey ? counts[n.badgeKey] : 0;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center justify-between px-6 py-3 text-sm transition-colors ${startBorder} ${
                active
                  ? 'border-accent bg-subtle/70 text-ink font-medium'
                  : 'border-transparent text-muted hover:text-ink hover:bg-subtle/40'
              }`}
            >
              <span>{t(n.labelKey)}</span>
              {badge > 0 ? (
                <span className="bg-accent text-bg text-[10px] min-w-[18px] h-[18px] px-1.5 rounded-full grid place-items-center font-medium">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-border space-y-2 text-xs">
        {username ? (
          <div className="text-muted">
            {t('sidebar.signedInAs')} <span className="text-ink">{username}</span>
          </div>
        ) : null}
        <button
          onClick={onLogout}
          className="text-accent hover:underline tracking-widest uppercase text-[10px]"
        >
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
}
