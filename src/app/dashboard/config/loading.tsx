export default function WebhookConfigLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <div className="h-8 w-60 skeleton mb-2" />
        <div className="h-4 w-80 skeleton" />
      </div>

      {/* Main Status & Configuration Card */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 lg:p-8 shadow-xl shadow-black/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/30">
          <div className="space-y-2">
            <div className="h-4 w-32 skeleton" />
            <div className="h-6 w-48 skeleton" />
          </div>
          <div className="h-10 w-36 skeleton rounded-xl" />
        </div>

        {/* Webhook URL Input Skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-28 skeleton" />
          <div className="h-11 skeleton rounded-xl" />
          <div className="h-3 w-72 skeleton" />
        </div>

        {/* User ID Skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-20 skeleton" />
          <div className="h-11 skeleton rounded-xl" />
          <div className="h-3 w-64 skeleton" />
        </div>
      </div>

      {/* Setup Guide Card Skeleton */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 lg:p-8 shadow-xl shadow-black/10 space-y-6">
        <div className="h-6 w-40 skeleton" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 rounded-full skeleton shrink-0" />
              <div className="space-y-2 w-full">
                <div className="h-4 w-1/3 skeleton" />
                <div className="h-3 w-2/3 skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
