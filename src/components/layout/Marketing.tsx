// Tag Manager + Meta pixel loaders and the floating WhatsApp button. IDs come from the
// dashboard (Settings → Tracking); nothing loads until they are set.
export function TrackingScripts({ gtmId, pixelId }: { gtmId: string; pixelId: string }) {
  const gtm = /^GTM-[A-Z0-9]{4,12}$/.test(gtmId) ? gtmId : "";
  const pixel = /^\d{10,20}$/.test(pixelId) ? pixelId : "";
  return (
    <>
      {gtm && (
        <>
          {/* The official GTM snippet; @next/third-parties isn't installed, and this keeps the container ID dashboard-driven. */}
          {/* eslint-disable-next-line @next/next/next-script-for-ga */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
            }}
          />
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" />
          </noscript>
        </>
      )}
      {pixel && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`,
          }}
        />
      )}
    </>
  );
}

export function WhatsAppButton({ phone }: { phone: string }) {
  const digits = phone.replace(/\D/g, "");
  if (!/^(880)?0?1[3-9]\d{8}$/.test(digits)) return null;
  const number = digits.startsWith("880") ? digits : `88${digits.startsWith("0") ? digits : `0${digits}`}`;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 md:bottom-6"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3ZM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
      </svg>
    </a>
  );
}
