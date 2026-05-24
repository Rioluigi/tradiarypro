export default function AnalyticsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <div className="h-8 w-32 skeleton mb-2" />
        <div className="h-4 w-72 skeleton" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg skeleton" />
              <div className="h-3 w-16 skeleton" />
            </div>
            <div className="h-6 w-24 skeleton" />
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit by Symbol skeleton */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/10">
          <div className="h-5 w-40 skeleton mb-6" />
          <div className="h-72 skeleton rounded-xl" />
        </div>

        {/* Win vs Loss skeleton */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/10">
          <div className="h-5 w-32 skeleton mb-6" />
          <div className="h-72 skeleton rounded-xl" />
        </div>
      </div>

      {/* Cumulative Profit skeleton */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 shadow-xl shadow-black/10">
        <div className="h-5 w-44 skeleton mb-6" />
        <div className="h-72 skeleton rounded-xl" />
      </div>
    </div>
  );
}
