import { notFound } from 'next/navigation';

import { isLocale, type Locale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function ReturnsPage({
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
        {isAR ? 'سياسة الاسترجاع والاستبدال' : 'Return & Refund Policy'}
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
      <div className="bg-accent/10 border-s-2 border-accent ps-4 py-3">
        <strong className="block text-accent mb-1">ملاحظة مهمة</strong>
        <p>
          نقبل الاسترجاع أو الاستبدال <strong>فقط فى حالة وجود خطأ من
          جهتنا</strong> (منتج معيب أو وصول منتج مختلف عما طلبتيه). الإرجاع
          بسبب تغيير الرأى، عدم ملاءمة المقاس، أو أى سبب شخصى آخر غير مقبول.
        </p>
      </div>

      <Section title="١. الحالات المقبولة للإرجاع">
        <ul className="list-disc ms-6 space-y-2">
          <li>وصول منتج مختلف عن المنتج المطلوب (لون أو موديل).</li>
          <li>وصول المنتج بـعيب فى التصنيع (خياطة، خامة، تطريز).</li>
          <li>وصول المنتج تالفاً نتيجة الشحن.</li>
        </ul>
      </Section>

      <Section title="٢. الحالات غير المقبولة">
        <ul className="list-disc ms-6 space-y-2">
          <li>تغيير الرأى بعد الشراء.</li>
          <li>عدم ملاءمة المقاس بسبب اختيار العميل غير الصحيح.</li>
          <li>اختلاف اللون البسيط الناتج عن إضاءة الشاشة.</li>
          <li>
            <strong>المنتجات المُفصّلة بمقاس خاص (Custom Size)</strong> —
            هذه المنتجات تُصنع خصيصاً للعميل ولا يمكن إرجاعها إلا فى حالة
            عيب صناعى واضح.
          </li>
          <li>المنتجات المُستخدمة أو التى تم إزالة بطاقاتها الأصلية.</li>
        </ul>
      </Section>

      <Section title="٣. خطوات الإرجاع">
        <ol className="list-decimal ms-6 space-y-2">
          <li>
            تواصلى معنا عبر <strong>واتساب</strong> خلال <strong>٤٨ ساعة</strong>{' '}
            من استلام الطلب مع رقم الطلب (BA-XXXX) وصورة توضح المشكلة.
          </li>
          <li>
            بعد مراجعة طلبكِ والموافقة، نُرسل لكِ تعليمات الإرجاع. لا تُرسلى
            المنتج قبل الحصول على موافقة كتابية.
          </li>
          <li>
            يجب أن يكون المنتج فى حالته الأصلية مع كل البطاقات والتغليف.
          </li>
        </ol>
      </Section>

      <Section title="٤. رسوم الشحن">
        <p>
          فى حالة الموافقة على الإرجاع لخطأ من جهتنا، <strong>ديدا تتحمل
          كامل تكلفة شحن المرتجع</strong>. سنُرتب مع شركة الشحن لاستلام
          المنتج من عنوانكِ.
        </p>
      </Section>

      <Section title="٥. الاسترداد">
        <ul className="list-disc ms-6 space-y-2">
          <li>
            بما أن الدفع عند الاستلام نقداً، فالاسترداد يتم نقداً أيضاً
            عن طريق تحويل بنكى أو محفظة إلكترونية (فودافون كاش / إنستا
            باى) حسب اختيارك، أو كاش مع المندوب لو كنتِ فى القاهرة
            الكبرى.
          </li>
          <li>
            بعد استلام المنتج وفحصه (٢ – ٥ أيام عمل) نُحوّل المبلغ كاملاً
            خلال <strong>٣ – ٥ أيام عمل</strong>.
          </li>
          <li>
            يمكنكِ اختيار <strong>الاستبدال بمنتج آخر</strong> بنفس القيمة
            بدلاً من الاسترداد.
          </li>
        </ul>
      </Section>

      <Section title="٦. التواصل">
        <p>
          لأى استفسار يخص الإرجاع، يرجى التواصل معنا عبر الواتساب أو
          الانستجرام (الروابط فى الأسفل) مع رقم الطلب الخاص بكِ.
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
      <div className="bg-accent/10 border-l-2 border-accent pl-4 py-3">
        <strong className="block text-accent mb-1">Important</strong>
        <p>
          We accept returns or exchanges <strong>only when there is an
          error on our side</strong> (a defective item or the wrong item
          shipped). Returns for change of mind, sizing issues, or any
          other personal reason are not accepted.
        </p>
      </div>

      <Section title="1. Eligible cases">
        <ul className="list-disc ml-6 space-y-2">
          <li>You received a different item than the one you ordered (colour or style).</li>
          <li>The item arrived with a manufacturing defect (stitching, fabric, embroidery).</li>
          <li>The item arrived damaged due to shipping.</li>
        </ul>
      </Section>

      <Section title="2. Ineligible cases">
        <ul className="list-disc ml-6 space-y-2">
          <li>Change of mind after purchase.</li>
          <li>Sizing issues due to the customer's own choice.</li>
          <li>Minor colour differences caused by screen lighting.</li>
          <li>
            <strong>Items ordered with a custom size</strong> — these are
            made specifically for you and cannot be returned except in
            the case of a clear manufacturing defect.
          </li>
          <li>Items that have been used or have had their original tags removed.</li>
        </ul>
      </Section>

      <Section title="3. Return process">
        <ol className="list-decimal ml-6 space-y-2">
          <li>
            Contact us via <strong>WhatsApp</strong> within{' '}
            <strong>48 hours</strong> of receiving the order, with the
            order number (BA-XXXX) and a photo showing the issue.
          </li>
          <li>
            After reviewing and approving your request, we will send you
            return instructions. Please do not ship the item back before
            written approval.
          </li>
          <li>The item must be in its original condition with all tags and packaging.</li>
        </ol>
      </Section>

      <Section title="4. Return shipping">
        <p>
          When a return is approved for an error on our side,{' '}
          <strong>Deda covers the full return shipping cost</strong>.
          We will arrange courier pickup from your address.
        </p>
      </Section>

      <Section title="5. Refund">
        <ul className="list-disc ml-6 space-y-2">
          <li>
            Since payment is cash on delivery, refunds are issued the same
            way: bank transfer or e-wallet (Vodafone Cash / InstaPay) of
            your choice, or cash via the courier if you are inside Greater
            Cairo.
          </li>
          <li>
            After receiving and inspecting the item (2 – 5 working days),
            we send the refund within <strong>3 – 5 working days</strong>.
          </li>
          <li>
            You can choose <strong>an exchange of equal value</strong>{' '}
            instead of a refund.
          </li>
        </ul>
      </Section>

      <Section title="6. Contact">
        <p>
          For any question regarding returns, please contact us via
          WhatsApp or Instagram (links in the footer) with your order
          number.
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
