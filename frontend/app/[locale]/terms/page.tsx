import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isAR = (locale as Locale) === 'ar';

  return (
    <article className="max-w-3xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
      <div className="text-[10px] tracking-widest uppercase text-muted mb-3">
        {isAR ? 'ديدا' : 'Deda'}
      </div>
      <h1 className="font-display text-4xl lg:text-5xl mb-10">
        {isAR ? 'الشروط والأحكام' : 'Terms & Conditions'}
      </h1>

      <div className="space-y-8 text-sm lg:text-base leading-relaxed text-ink/85">
        {isAR ? <ContentAR /> : <ContentEN />}
      </div>
    </article>
  );
}

function ContentAR() {
  return (
    <>
      <p>
        مرحباً بكم فى متجر ديدا. بدخولك لهذا الموقع أو إجراء أى عملية شراء عليه
        فإنك توافق على الشروط والأحكام التالية. يرجى قراءتها بعناية قبل
        الاستخدام.
      </p>

      <Section title="١. القبول">
        <p>
          باستخدامك الموقع أو إتمام عملية شراء فإنك تُقرّ بأنك قرأت وفهمت
          ووافقت على جميع البنود الواردة هنا. إذا لم توافق على أى بند، يرجى
          عدم استخدام الموقع.
        </p>
      </Section>

      <Section title="٢. شروط الاستخدام">
        <ul className="list-disc ms-6 space-y-2">
          <li>يجب أن يكون عمرك ١٨ سنة فأكثر لإجراء أى عملية شراء.</li>
          <li>
            تتعهد بتقديم بيانات صحيحة (الاسم، العنوان، رقم الهاتف) وقت
            الطلب. أى بيانات غير صحيحة قد تؤدى لإلغاء الطلب.
          </li>
          <li>يُمنع استخدام الموقع لأى غرض غير قانونى أو احتيالى.</li>
        </ul>
      </Section>

      <Section title="٣. الأسعار والدفع">
        <ul className="list-disc ms-6 space-y-2">
          <li>جميع الأسعار بالدينار الكويتى (جنيه) وتشمل ضريبة القيمة المضافة عند انطباقها.</li>
          <li>الدفع متاح إلكترونياً عبر KNET وApple Pay وVisa وMastercard وtabby، عبر بوابة Tap الآمنة.</li>
          <li>يحتفظ الموقع بالحق فى رفض أو إلغاء أى طلب فى حال الاشتباه فى احتيال أو خطأ فى السعر.</li>
        </ul>
      </Section>

      <Section title="٤. الشحن والتوصيل">
        <ul className="list-disc ms-6 space-y-2">
          <li>التوصيل داخل الكويت خلال ١ – ٣ أيام عمل من تاريخ تأكيد الطلب.</li>
          <li>التوصيل الدولى خلال ٥ – ١٠ أيام عمل حسب الدولة.</li>
          <li>قد تتأخر أوقات التوصيل فى الإجازات الرسمية أو الظروف الطارئة.</li>
        </ul>
      </Section>

      <Section title="٥. المنتجات والصور">
        <p>
          نبذل قصارى جهدنا لعرض ألوان المنتجات وتفاصيلها بأكبر دقة ممكنة. قد
          يظهر اللون أو الخامة بشكل مختلف قليلاً تبعاً لشاشة الجهاز. لذلك لا
          نعتبر الاختلاف البسيط فى اللون عيباً يستوجب الإرجاع.
        </p>
      </Section>

      <Section title="٦. المقاسات الخاصة">
        <p>
          المنتجات المُفصّلة بمقاس خاص (Custom Size) تُصنع خصيصاً للعميل،
          ولذلك <strong>لا يمكن استرجاعها أو استبدالها</strong> إلا فى حالة
          عيب من المصنع.
        </p>
      </Section>

      <Section title="٧. حقوق الملكية الفكرية">
        <p>
          جميع المحتويات على هذا الموقع (الشعار، الصور، النصوص، التصميم)
          ملك حصرى لديدا. يُمنع نسخها أو استخدامها لأى غرض تجارى دون إذن
          مكتوب.
        </p>
      </Section>

      <Section title="٨. حدود المسؤولية">
        <p>
          ديدا غير مسؤولة عن أى ضرر غير مباشر ناتج عن استخدام الموقع، بما
          فى ذلك انقطاع الخدمة أو فقدان البيانات. مسؤوليتنا محدودة بقيمة
          الطلب المدفوع.
        </p>
      </Section>

      <Section title="٩. القانون المُطبَّق">
        <p>
          تخضع هذه الشروط لأحكام القانون الكويتى، وتختص المحاكم الكويتية
          بالفصل فى أى نزاع.
        </p>
      </Section>

      <Section title="١٠. التواصل">
        <p>
          لأى استفسار حول هذه الشروط يرجى التواصل معنا عبر الواتساب أو
          الانستجرام (الروابط فى الأسفل).
        </p>
      </Section>

      <p className="text-xs text-muted pt-6 border-t border-border">
        آخر تحديث: يونيو ٢٠٢٦
      </p>
    </>
  );
}

function ContentEN() {
  return (
    <>
      <p>
        Welcome to Deda. By accessing this website or placing any order
        on it you agree to the following terms and conditions. Please
        read them carefully before continuing.
      </p>

      <Section title="1. Acceptance">
        <p>
          By using this site or completing a purchase you confirm that
          you have read, understood, and agreed to every clause below.
          If you do not agree, please do not use the site.
        </p>
      </Section>

      <Section title="2. Use of the site">
        <ul className="list-disc ml-6 space-y-2">
          <li>You must be 18 years or older to place an order.</li>
          <li>
            You agree to provide accurate information (name, address,
            phone number) at checkout. Inaccurate data may result in
            order cancellation.
          </li>
          <li>The site may not be used for any unlawful or fraudulent purpose.</li>
        </ul>
      </Section>

      <Section title="3. Pricing & payment">
        <ul className="list-disc ml-6 space-y-2">
          <li>All prices are in Kuwaiti Dinar (EGP) and include VAT where applicable.</li>
          <li>
            Payment is accepted electronically via KNET, Apple Pay, Visa,
            Mastercard, and tabby through the secure Tap gateway.
          </li>
          <li>
            We reserve the right to refuse or cancel any order in the event
            of suspected fraud or pricing error.
          </li>
        </ul>
      </Section>

      <Section title="4. Shipping & delivery">
        <ul className="list-disc ml-6 space-y-2">
          <li>Delivery within Kuwait: 1 – 3 working days after order confirmation.</li>
          <li>International delivery: 5 – 10 working days depending on the destination.</li>
          <li>
            Delivery times may be extended during public holidays or
            unforeseen circumstances.
          </li>
        </ul>
      </Section>

      <Section title="5. Products & imagery">
        <p>
          We make every effort to display product colours and details
          accurately. Some variation may occur due to the screen you are
          viewing on. Minor colour or texture differences are not
          considered defects.
        </p>
      </Section>

      <Section title="6. Custom-size items">
        <p>
          Items ordered with a custom size are made specifically for the
          customer and <strong>cannot be returned or exchanged</strong>{' '}
          except where a manufacturing defect is found.
        </p>
      </Section>

      <Section title="7. Intellectual property">
        <p>
          All content on this site (logo, photography, copy, design) is
          the exclusive property of Deda. Copying or commercial use is
          prohibited without written permission.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          Deda is not liable for any indirect damages arising from use
          of the site, including service downtime or data loss. Our
          liability is limited to the value of the order paid.
        </p>
      </Section>

      <Section title="9. Governing law">
        <p>
          These terms are governed by the laws of Kuwait. The Kuwaiti
          courts have exclusive jurisdiction over any dispute.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          For any question about these terms, please reach us via WhatsApp
          or Instagram (links in the footer).
        </p>
      </Section>

      <p className="text-xs text-muted pt-6 border-t border-border">
        Last updated: June 2026
      </p>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl lg:text-2xl mb-3">{title}</h2>
      {children}
    </section>
  );
}
