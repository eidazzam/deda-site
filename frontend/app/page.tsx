import { redirect } from 'next/navigation';

import { DEFAULT_LOCALE } from '@/lib/i18n/config';

// Root URL always sends the visitor into the default locale. A nicer
// experience is to sniff Accept-Language, but the storefront is for a
// Egyptian audience that uses both AR and EN comfortably, so we just pick
// the project's default and let the user switch in the header.
export default function Page() {
  redirect(`/${DEFAULT_LOCALE}`);
}
