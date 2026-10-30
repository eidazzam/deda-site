import Link from 'next/link';

// Locale-scoped 404 — Next.js falls back here when notFound() is called
// from any page under /[locale]/*. The header/footer shell from the
// LocaleLayout still wraps it, so the page feels like part of the site.
export default function NotFound() {
  return (
    <section className="max-w-md mx-auto text-center py-24 px-6">
      <div className="text-xs tracking-widest uppercase text-muted mb-4">404</div>
      <h1 className="display-xl text-4xl mb-3">Page not found</h1>
      <p className="text-muted leading-relaxed mb-8">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Link
        href="/"
        className="inline-block bg-ink text-bg text-sm tracking-widest uppercase px-8 py-3 hover:bg-accent transition-colors"
      >
        Back home
      </Link>
    </section>
  );
}
