import { Skeleton } from "@/components/ui/skeleton";

function Shimmer({ className }: { className?: string }) {
  return (
    <Skeleton
      className={`animate-pulse bg-gradient-to-r from-border via-background to-border ${className ?? ""}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-10">
      <div className="overflow-hidden rounded-[22px] border border-border bg-background p-6 md:p-7">
        <Shimmer className="h-3 w-28 rounded-md" />
        <Shimmer className="mt-5 h-10 w-72 max-w-full rounded-lg" />
        <Shimmer className="mt-3 h-4 w-96 max-w-full rounded-md" />
        <div className="mt-3 flex gap-2">
          <Shimmer className="h-3 w-40 rounded-md" />
          <Shimmer className="h-3 w-16 rounded-md" />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Shimmer className="h-10 w-44 rounded-xl" />
          <Shimmer className="size-10 rounded-xl" />
          <Shimmer className="size-10 rounded-xl" />
          <Shimmer className="h-10 w-32 rounded-xl" />
        </div>
        <Shimmer className="mt-6 h-11 w-full rounded-2xl lg:hidden" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Shimmer key={index} className="h-32 rounded-[18px]" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Shimmer key={index} className="h-[120px] rounded-[18px]" />
        ))}
      </div>

      <Shimmer className="h-56 rounded-[18px]" />

      <div className="grid gap-6 xl:grid-cols-2">
        <Shimmer className="h-80 rounded-[18px]" />
        <Shimmer className="h-80 rounded-[18px]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Shimmer className="h-80 rounded-[18px]" />
        <Shimmer className="h-80 rounded-[18px]" />
      </div>

      <Shimmer className="h-72 rounded-[18px]" />

      <div className="grid gap-6 xl:grid-cols-3">
        <Shimmer className="h-56 rounded-[18px] xl:col-span-2" />
        <div className="space-y-4">
          <Shimmer className="h-52 rounded-[18px]" />
          <Shimmer className="h-40 rounded-[18px]" />
        </div>
      </div>
    </div>
  );
}
