'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import { setAdminSession } from '@/lib/admin/auth';
import { useAdminI18n } from '@/lib/admin/i18n';

export default function AdminLoginPage() {
  const { t } = useAdminI18n();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminApi.auth.login(username.trim(), password);
      setAdminSession(res.token, res.username);
      router.push('/admin');
    } catch (err) {
      const message =
        err instanceof AdminApiError ? err.message : t('login.failed');
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-bg border border-border p-8 shadow-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/brand/logo.png"
            alt="Deda"
            width={320}
            height={320}
            priority
            className="h-40 w-auto object-contain"
          />
          <div className="text-[10px] tracking-widest uppercase text-muted mt-3">
            {t('login.title')}
          </div>
        </div>

        <label className="block mb-4">
          <span className="block text-[10px] tracking-widest uppercase text-muted mb-2">
            {t('login.username')}
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full bg-bg border border-border px-3 py-2.5 focus:border-ink outline-none"
            required
          />
        </label>

        <label className="block mb-6">
          <span className="block text-[10px] tracking-widest uppercase text-muted mb-2">
            {t('login.password')}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full bg-bg border border-border px-3 py-2.5 focus:border-ink outline-none"
            required
          />
        </label>

        {error ? (
          <div className="mb-4 text-xs text-accent bg-accent/10 border border-accent/30 px-3 py-2">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink text-bg text-sm tracking-widest uppercase py-3 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {submitting ? t('login.signingIn') : t('login.signIn')}
        </button>
      </form>
    </div>
  );
}
