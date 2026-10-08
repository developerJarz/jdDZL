// The reference used a remote "google-play.svg" that is not in the snapshot; this is an
// equivalent badge drawn in markup (swap for the official artwork if licensed).
export function GooglePlayBadge() {
  return (
    <span className="inline-flex items-center gap-2 h-10 w-[130px] px-2.5 rounded-xl border-2 border-[#282828] bg-black text-white">
      <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true">
        <path d="M1 1.3 11.2 11 1 20.7c-.3-.2-.5-.6-.5-1.1V2.4c0-.5.2-.9.5-1.1Z" fill="#00D7FE" />
        <path d="m14.6 7.7-3.4 3.3L1 1.3c.2-.1.6-.1 1 .1l12.6 6.3Z" fill="#00F076" />
        <path d="m14.6 14.3-12.6 6.3c-.4.2-.8.2-1 .1L11.2 11l3.4 3.3Z" fill="#F83A4F" />
        <path d="m18.4 12.2-3.8 2.1-3.4-3.3 3.4-3.3 3.8 2.1c1 .5 1 1.9 0 2.4Z" fill="#FFC600" />
      </svg>
      <span className="flex flex-col leading-none whitespace-nowrap">
        <span className="text-[7px] tracking-wide uppercase">Get it on</span>
        <span className="text-[14px] font-medium mt-0.5 whitespace-nowrap">Google Play</span>
      </span>
    </span>
  );
}
