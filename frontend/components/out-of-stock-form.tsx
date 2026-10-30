'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { api, ApiError } from '@/lib/api/client';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

type Props = {
  locale: Locale;
  dict: Dictionary;
  productSlug: string;
  colorName?: string;
  size?: string;
};

export function OutOfStockForm({ locale, dict, productSlug, colorName, size }: Props) {
  const isAR = locale === 'ar';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 8 &&
    /.+@.+\..+/.test(email.trim()) &&
    !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.leads.notifyOutOfStock({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        productSlug,
        colorName: colorName ?? null,
        size: size ?? null,
      });
      setDone(true);
      toast.success(
        isAR
          ? 'تم تسجيل بياناتك. هنبلّغك أول ما القطعة ترجع.'
          : "We've got your details. We'll reach out when this is back.",
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : isAR
            ? 'حصل خطأ. حاول مرة أخرى.'
            : 'Something went wrong. Try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bg-subtle/60 p-5 text-center">
        <div className="text-sm font-medium mb-1">
          {isAR ? 'تم!' : 'All set'}
        </div>
        <p className="text-xs text-muted">
          {isAR
            ? 'سنتواصل معك أول ما القطعة ترجع.'
            : "We'll let you know as soon as it's back."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-subtle/60 p-5 space-y-3">
      <div>
        <div className="text-xs tracking-widest uppercase mb-1">{dict.outOfStock}</div>
        <p className="text-xs text-muted leading-relaxed">{dict.notifyText}</p>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={dict.name}
        className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none"
        required
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={dict.phone}
        className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={dict.email}
        className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none"
        required
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-ink text-bg text-xs tracking-widest uppercase py-3 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? '...' : dict.notifyMe}
      </button>
    </form>
  );
}
