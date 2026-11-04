export default function ServicesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-blue-200 rounded-lg" />
      </div>

      {/* Categories & Filter Strip */}
      <div className="flex gap-2 pb-2 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-slate-100 rounded-lg shrink-0" />
        ))}
      </div>

      {/* Services List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-xs"
          >
            <div className="space-y-2">
              <div className="h-5 w-44 bg-slate-200 rounded" />
              <div className="h-3.5 w-60 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-6 w-16 bg-slate-100 rounded" />
              <div className="h-6 w-12 bg-slate-200 rounded" />
              <div className="h-8 w-16 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

