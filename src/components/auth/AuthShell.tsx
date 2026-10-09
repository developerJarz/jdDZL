import { Img } from "@/components/ui/Img";
import type { ImageAsset } from "@/types";

/** Centered auth layout with the (dark-tinted) wordmark, as on /auth/login. */
export function AuthShell({
  logo,
  title,
  subtitle,
  children,
}: {
  logo: ImageAsset;
  title?: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#2e2b28] px-4 pt-8 pb-16">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <Img
            asset={logo}
            alt="dazzle.bd logo"
            width={200}
            height={41}
            priority
            className="h-auto brightness-0 dark:brightness-100"
          />
          {title && (
            <h1 className="mt-6 text-2xl font-bold text-[#101518] dark:text-white">
              {title}
            </h1>
          )}
          <p
            className={
              (title ? "mt-1" : "mt-5") +
              " text-sm text-[#4b4b8f] dark:text-gray-300"
            }
          >
            {subtitle}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
