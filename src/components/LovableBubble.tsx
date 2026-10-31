/**
 * LovableBubble — portable floating invite link (Tailwind only, no dependencies).
 * Fixed bottom-right, hidden on mobile, always on top and clickable.
 */
const INVITE_URL = "https://lovable.dev/invite/NZPTJTD";
const LABEL = "Try Lovable with +10 credits";

export function LovableBubble() {
  return (
    <a
      href={INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={LABEL}
      aria-label={LABEL}
      className="pointer-events-auto fixed bottom-4 right-4 z-[2147483647] hidden h-12 w-12 items-center justify-center -left-px -bottom-0.5 relative rounded-full border-2 border-black bg-white shadow-[3px_3px_0_0_#000] transition-[transform,opacity] duration-200 ease-out hover:scale-[1.02] hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:flex"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="block h-6 w-6 rotate-45 fill-red-500">
        <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
      </svg>
    </a>
  );
}
