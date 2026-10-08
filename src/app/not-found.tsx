import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-[#FFFBF6] md:bg-white md:dark:bg-[#302d29] dark:bg-[#2e2b28] flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center max-w-md">
        <p className="text-9xl font-extrabold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,#8A7F76_0%,#E9CCAE_50%,#C9A060_100%)] leading-none" aria-hidden="true">
          404
        </p>
        <div className="flex items-center gap-4 my-6">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-sm tracking-[0.15em] text-gray-500 uppercase">Page not found</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>
        <h1 className="text-3xl font-semibold text-[#101518] dark:text-white">Oops! You&apos;ve drifted into space.</h1>
        <p className="mt-5 text-gray-500 dark:text-gray-300 leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-10 px-8 h-12 rounded-full text-white font-semibold shadow-lg bg-[linear-gradient(90deg,#4B4F5C_0%,#E9CCAE_100%)] hover:opacity-90"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
