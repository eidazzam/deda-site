'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

import { AdminSidebar } from '@/components/admin/sidebar';
import { getAdminToken } from '@/lib/admin/auth';
import { AdminI18nProvider, useAdminI18n } from '@/lib/admin/i18n';

/**
 * Admin shell. The login page bypasses the sidebar and the auth gate;
 * everything else under /admin requires a valid token. We check the
 * presence of the token client-side and redirect to /admin/login if it
 * is missing. The token is JWT-verified on every API call too, so a
 * fake token only buys an unauthenticated user a blank screen.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminI18nProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminI18nProvider>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { locale, t } = useAdminI18n();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  // Print views drop the sidebar so we get a clean A4 layout for the
  // browser's "Save as PDF" dialog. They still sit inside /admin so
  // the auth gate below protects them too.
  const isPrintPage =
    pathname.endsWith('/invoice') || pathname.endsWith('/export-print');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setAuthChecked(true);
      return;
    }
    const token = getAdminToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setAuthChecked(true);
  }, [isLoginPage, router]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  if (isLoginPage) {
    return <div lang={locale} dir={dir}>{children}</div>;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg" lang={locale} dir={dir}>
        <div className="text-xs tracking-widest uppercase text-muted animate-pulse">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  // Print pages follow the admin's current language so the printed
  // invoice / report matches the toggle in the sidebar. RTL is fine on
  // A4 — the browser flips the layout on its own.
  if (isPrintPage) {
    return <div lang={locale} dir={dir}>{children}</div>;
  }

  return (
    <div lang={locale} dir={dir} className="flex min-h-screen bg-bg">
      <AdminSidebar />
      <main className="flex-1 min-w-0">{children}</main>
      {/* Single global toaster — pages call toast.success/error inline. */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontSize: '13px',
            letterSpacing: '0.05em',
          },
          success: { iconTheme: { primary: '#7fb069', secondary: 'var(--bg)' } },
          error:   { iconTheme: { primary: '#e85c5c', secondary: 'var(--bg)' } },
        }}
      />
    </div>
  );
}
