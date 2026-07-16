import { Skeleton } from "@/components/ui/skeleton";

function Shimmer({ className }: { className?: string }) {
  return (
    <Skeleton
      className={`animate-pulse bg-gradient-to-r from-border via-background to-border ${className ?? ""}`}
    />
  );
}

export function DashboardPanelsSkeleton() {
  return (
    <div className="space-y-8">
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
