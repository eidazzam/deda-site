import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function PrivacyPage({
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
        {isAR ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
        خصوصيتكِ مهمة لنا. هذه السياسة تشرح كيف نجمع بياناتكِ ونستخدمها
        ونحميها عند استخدامكِ لموقع ديدا.
      </p>

      <Section title="١. البيانات التى نجمعها">
        <p>عند إجراء طلب أو التواصل معنا، نجمع البيانات التالية:</p>
        <ul className="list-disc ms-6 space-y-2 mt-2">
          <li><strong>بيانات الهوية:</strong> الاسم الكامل.</li>
          <li><strong>بيانات التواصل:</strong> رقم الهاتف والعنوان.</li>
          <li><strong>بيانات الطلب:</strong> تفاصيل المنتجات، الكميات، والمحافظة.</li>
          <li>
            <strong>بيانات الدفع:</strong> لا نجمع أى بيانات بنكية أو
            بطاقات ائتمانية — الدفع عند الاستلام نقداً للمندوب فقط.
          </li>
          <li>
            <strong>بيانات التصفح:</strong> عنوان IP، نوع المتصفح، الصفحات
            التى زرتيها (لتحسين تجربة الموقع).
          </li>
        </ul>
      </Section>

      <Section title="٢. كيف نستخدم البيانات">
        <ul className="list-disc ms-6 space-y-2">
          <li>تنفيذ الطلب والتوصيل.</li>
          <li>التواصل معكِ بخصوص حالة الطلب.</li>
          <li>الرد على استفساراتكِ.</li>
          <li>تحسين تجربة الموقع.</li>
          <li>إرسال عروض أو تخفيضات (فقط إذا اخترتِ ذلك).</li>
        </ul>
      </Section>

      <Section title="٣. مشاركة البيانات">
        <p>
          <strong>لا نبيع بياناتكِ أبداً لأى جهة خارجية.</strong> نشارك
          البيانات فقط مع:
        </p>
        <ul className="list-disc ms-6 space-y-2 mt-2">
          <li>شركات الشحن (الاسم، الهاتف، العنوان) لتوصيل الطلب فقط.</li>
          <li>الجهات الحكومية إذا طُلب منا قانونياً.</li>
        </ul>
      </Section>

      <Section title="٤. ملفات تعريف الارتباط (Cookies)">
        <p>
          نستخدم Cookies لحفظ حالة سلة الشراء وتفضيلات اللغة (عربى /
          إنجليزى). كما نستخدم أدوات تتبع من Facebook Pixel و TikTok
          Pixel لقياس فعالية الإعلانات. يمكنكِ تعطيل الـCookies من إعدادات
          المتصفح، لكن قد لا يعمل الموقع بشكل كامل بدونها.
        </p>
      </Section>

      <Section title="٥. أمان البيانات">
        <p>
          نستخدم اتصالاً مُشفّراً (HTTPS / SSL) فى جميع صفحات الموقع
          لحماية البيانات الشخصية أثناء إرسالها.
        </p>
      </Section>

      <Section title="٦. حقوقكِ">
        <p>لكِ الحق فى:</p>
        <ul className="list-disc ms-6 space-y-2 mt-2">
          <li>الاطلاع على بياناتكِ المحفوظة لدينا.</li>
          <li>تصحيح أى بيانات غير صحيحة.</li>
          <li>طلب حذف بياناتكِ (ما عدا سجلات الطلبات للأغراض المحاسبية).</li>
          <li>إلغاء الاشتراك من الرسائل التسويقية فى أى وقت.</li>
        </ul>
        <p className="mt-2">
          للممارسة أى من هذه الحقوق، تواصلى معنا عبر الواتساب أو
          الانستجرام.
        </p>
      </Section>

      <Section title="٧. مدة الاحتفاظ">
        <p>
          نحتفظ ببيانات الطلبات لمدة <strong>٥ سنوات</strong> لأغراض
          محاسبية وقانونية. بعد ذلك تُحذف تلقائياً.
        </p>
      </Section>

      <Section title="٨. تحديثات على هذه السياسة">
        <p>
          قد نُحدّث هذه السياسة من وقت لآخر. سنُعلن عن أى تغيير جوهرى على
          الصفحة الرئيسية أو عبر إيميل (إن وُجد).
        </p>
      </Section>

      <p className="text-xs text-muted pt-6 border-t border-border">
        آخر تحديث: نوفمبر ٢٠٢٦
      </p>
    </>
  );
}

function ContentEN() {
  return (
    <>
      <p>
        Your privacy matters. This policy explains how we collect, use,
        and protect your data when you use the Deda site.
      </p>

      <Section title="1. Data we collect">
        <p>When you place an order or contact us, we collect:</p>
        <ul className="list-disc ml-6 space-y-2 mt-2">
          <li><strong>Identity:</strong> your full name.</li>
          <li><strong>Contact:</strong> phone number and address.</li>
          <li><strong>Order:</strong> product details, quantities, and governorate.</li>
          <li>
            <strong>Payment:</strong> we do not collect any card or bank
            data — payment is cash on delivery, collected by the courier.
          </li>
          <li>
            <strong>Browsing:</strong> IP address, browser type, pages
            visited (used to improve site performance).
          </li>
        </ul>
      </Section>

      <Section title="2. How we use the data">
        <ul className="list-disc ml-6 space-y-2">
          <li>Fulfilling and delivering your order.</li>
          <li>Contacting you about order status.</li>
          <li>Responding to your enquiries.</li>
          <li>Improving the website experience.</li>
          <li>Sending offers or promotions (only if you opt in).</li>
        </ul>
      </Section>

      <Section title="3. Sharing data">
        <p>
          <strong>We never sell your data to any third party.</strong> We
          share data only with:
        </p>
        <ul className="list-disc ml-6 space-y-2 mt-2">
          <li>Courier companies (name, phone, address) — solely to deliver the order.</li>
          <li>Government authorities when legally required.</li>
        </ul>
      </Section>

      <Section title="4. Cookies">
        <p>
          We use cookies to remember your cart state and language
          preference (Arabic / English). We also use Facebook Pixel and
          TikTok Pixel to measure ad performance. You can disable cookies
          in your browser settings, but the site may not work fully
          without them.
        </p>
      </Section>

      <Section title="5. Data security">
        <p>
          The entire site uses encrypted HTTPS / SSL connections to
          protect personal data in transit.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>You have the right to:</p>
        <ul className="list-disc ml-6 space-y-2 mt-2">
          <li>Access the data we hold about you.</li>
          <li>Correct any inaccurate data.</li>
          <li>Request deletion of your data (except order records required for accounting).</li>
          <li>Unsubscribe from marketing messages at any time.</li>
        </ul>
        <p className="mt-2">
          To exercise any of these rights, contact us via WhatsApp or Instagram.
        </p>
      </Section>

      <Section title="7. Retention">
        <p>
          We retain order data for <strong>5 years</strong> for accounting
          and legal purposes. After that it is automatically deleted.
        </p>
      </Section>

      <Section title="8. Updates to this policy">
        <p>
          We may update this policy from time to time. Any material change
          will be announced on the homepage or by email (if available).
        </p>
      </Section>

      <p className="text-xs text-muted pt-6 border-t border-border">
        Last updated: November 2026
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
