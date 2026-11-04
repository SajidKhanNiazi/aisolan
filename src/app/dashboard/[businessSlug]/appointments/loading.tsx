export default function AppointmentsLoading() {
  return (
    <div className="max-w-7xl mx-auto py-4 space-y-6 animate-pulse">
      {/* Calendar Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
          <div className="h-9 w-28 bg-blue-200 rounded-lg" />
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 shadow-xs">
            <div className="h-3 w-16 bg-slate-100 rounded" />
            <div className="h-6 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-slate-100 rounded" />
            <div className="h-8 w-8 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 pt-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-2">
              <div className="h-4 w-8 bg-slate-200 rounded" />
              <div className="h-10 w-full bg-blue-50/50 rounded border border-blue-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

