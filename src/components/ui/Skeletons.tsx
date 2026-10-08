// Suspense fallbacks (the "App Shell" shown while route params resolve on client navigation).

export function ListingSkeleton() {
  return (
    <div className="flex flex-col flex-1 max-w-355 w-full mx-auto md:px-12.5 px-4 py-6" aria-busy="true">
      <div className="h-5 w-56 rounded bg-gray-100 dark:bg-[#2a2420] animate-pulse mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 hidden lg:block h-[520px] rounded-2xl bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
        <div className="lg:col-span-9 grid md:grid-cols-4 grid-cols-2 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-[#2a2420] rounded-2xl h-[372px] md:h-[404px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div className="max-w-355 w-full mx-auto px-4 md:px-9 py-6 grid lg:grid-cols-2 gap-8" aria-busy="true">
      <div className="aspect-square rounded-3xl bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 rounded bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
        <div className="h-5 w-1/3 rounded bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
        <div className="h-48 rounded-2xl bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
        <div className="h-32 rounded-2xl bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-355 w-full mx-auto px-4 md:px-8 py-8 space-y-4" aria-busy="true">
      <div className="h-5 w-48 rounded bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
      <div className="h-[320px] rounded-3xl bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
      <div className="h-40 rounded-2xl bg-gray-100 dark:bg-[#2a2420] animate-pulse" />
    </div>
  );
}
