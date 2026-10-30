'use client';

import { useEffect, useState } from 'react';

import { ApiDownNotice } from '@/components/api-down-notice';
import { CheckoutClient } from '@/components/checkout-client';
import { api } from '@/lib/api/client';
import type { Country, Governorate } from '@/lib/api/types';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Props = {
  locale: Locale;
  dict: Dictionary;
};

/**
 * Browser-side loader for the checkout page. Pulls the shipping zones
 * (governorates + countries) from the API on the client because the
 * Cloudflare Pages edge can't reach api.dedawomenswear.shop reliably from
 * inside the same zone.
 */
export function CheckoutPageClient({ locale, dict }: Props) {
  const [data, setData] = useState<{
    governorates: Governorate[];
    countries: Country[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.governorates.list({ cache: 'no-store' }),
      api.countries.list({ cache: 'no-store' }),
    ])
      .then(([governorates, countries]) => {
        if (cancelled) return;
        setData({ governorates, countries });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Checkout data fetch failed', err);
        setData(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-[1fr_360px] gap-10 animate-pulse">
        <div className="space-y-6">
          <div className="h-12 bg-subtle" />
          <div className="h-12 bg-subtle" />
          <div className="h-12 bg-subtle" />
          <div className="h-32 bg-subtle" />
        </div>
        <div className="h-64 bg-subtle" />
      </div>
    );
  }

  if (!data) {
    return <ApiDownNotice locale={locale} />;
  }

  return (
    <CheckoutClient
      locale={locale}
      dict={dict}
      governorates={data.governorates}
      countries={data.countries}
    />
  );
}
