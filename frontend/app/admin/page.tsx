'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { useAdminI18n } from '@/lib/admin/i18n';
import type { AdminStats } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';

export default function AdminDashboardPage() {
  const { t } = useAdminI18n();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.stats.get();
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof AdminApiError ? err.message : t('common.failedToLoad'));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const peakRevenue = stats
    ? Math.max(1, ...stats.last30Days.map((d) => d.revenue))
    : 1;

  return (
    <div className="px-8 py-10 max-w-6xl">
      <div className="mb-10">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-2">
          {t('common.admin')}
        </div>
        <h1 className="font-display text-4xl">{t('dashboard.title')}</h1>
      </div>

      {loading ? (
        <div className="text-muted">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-accent">{error}</div>
      ) : !stats ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              label={t('dashboard.totalOrders')}
              value={stats.totalOrders.toLocaleString()}
            />
            <StatCard
              label={t('dashboard.pending')}
              value={stats.pendingOrders.toLocaleString()}
              accent
            />
            <StatCard
              label={t('dashboard.revenue')}
              value={`${formatPrice(stats.totalRevenue, 'en')} EGP`}
            />
            <StatCard
              label={t('dashboard.avgOrder')}
              value={`${formatPrice(stats.averageOrderValue, 'en')} EGP`}
            />
          </div>

          <section className="bg-subtle/40 p-6">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-sm tracking-widest uppercase">
                {t('dashboard.last30Days')}
              </h2>
              <Link
                href="/admin/orders"
                className="text-[10px] tracking-widest uppercase text-accent hover:underline"
              >
                {t('dashboard.viewAllOrders')}
              </Link>
            </div>
            <div className="flex items-end gap-1 h-40">
              {stats.last30Days.map((d) => {
                const h = Math.max(2, (d.revenue / peakRevenue) * 100);
                return (
                  <div
                    key={d.day}
                    className="flex-1 group relative"
                    title={`${d.day}: ${d.orders} orders · ${formatPrice(d.revenue, 'en')} EGP`}
                  >
                    <div
                      className="w-full bg-accent/30 hover:bg-accent transition-colors"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted mt-2">
              <span>{stats.last30Days[0]?.day.slice(5)}</span>
              <span>{stats.last30Days.at(-1)?.day.slice(5)}</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`p-5 border border-border ${accent ? 'bg-accent/5' : 'bg-bg'}`}>
      <div className="text-[10px] tracking-widest uppercase text-muted mb-3">
        {label}
      </div>
      <div className="font-display text-2xl">{value}</div>
    </div>
  );
}
