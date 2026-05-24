export default function TradeHistoryLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="h-8 w-44 skeleton mb-2" />
          <div className="h-4 w-72 skeleton" />
        </div>
        <div className="h-10 w-32 skeleton rounded-xl" />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 lg:p-6 shadow-xl shadow-black/10">
        <div className="h-4 w-20 skeleton mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 w-16 skeleton mb-1.5" />
              <div className="h-10 skeleton rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Results summary */}
      <div className="flex justify-between items-center">
        <div className="h-4 w-48 skeleton" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 shadow-xl shadow-black/10 overflow-hidden">
        <div className="h-12 bg-slate-800/80 border-b border-slate-700/50 skeleton" />
        <div className="p-4 space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-10 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
