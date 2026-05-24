export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-40 skeleton mb-2" />
        <div className="h-4 w-64 skeleton" />
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 skeleton" />
              <div className="w-10 h-10 rounded-xl skeleton" />
            </div>
            <div className="h-8 w-32 skeleton mb-3" />
            <div className="h-5 w-28 skeleton rounded-full" />
          </div>
        ))}
      </div>

      {/* Equity Chart skeleton */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-5 w-28 skeleton mb-2" />
            <div className="h-3 w-44 skeleton" />
          </div>
          <div className="text-right">
            <div className="h-6 w-24 skeleton mb-1" />
            <div className="h-3 w-20 skeleton" />
          </div>
        </div>
        <div className="h-72 skeleton rounded-xl" />
      </div>

      {/* Recent Trades skeleton */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/10">
        <div className="h-5 w-32 skeleton mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}
