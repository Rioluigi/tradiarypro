export default function CalendarLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl skeleton flex-shrink-0" />
          <div>
            <div className="h-7 w-48 skeleton mb-2" />
            <div className="h-4 w-72 skeleton" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-36 skeleton rounded-xl" />
          <div className="h-10 w-28 skeleton rounded-xl" />
        </div>
      </div>

      {/* Calendar Card Skeleton */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/10">
        {/* Month Navigation Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-36 skeleton" />
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 skeleton rounded-xl" />
            <div className="w-16 h-9 skeleton rounded-xl" />
            <div className="w-9 h-9 skeleton rounded-xl" />
          </div>
        </div>

        {/* Days of Week Skeleton */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="py-2 flex justify-center">
              <div className="h-4 w-10 skeleton" />
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells Skeleton */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[75px] md:min-h-[90px] rounded-xl border border-slate-700/30 bg-slate-900/10 p-2 flex flex-col justify-between"
            >
              <div className="h-3 w-5 skeleton self-end" />
              <div className="h-4 w-12 skeleton" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Metrics Bar Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 flex items-center gap-3 shadow-lg shadow-black/5"
          >
            <div className="w-10 h-10 rounded-xl skeleton flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 skeleton" />
              <div className="h-5 w-24 skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
