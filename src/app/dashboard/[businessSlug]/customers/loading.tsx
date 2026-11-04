export default function CustomersLoading() {
  return (
    <div className="max-w-7xl mx-auto py-4 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-32 bg-blue-200 rounded-lg" />
      </div>

      {/* Search & Filter Bar */}
      <div className="h-10 w-full max-w-md bg-slate-100 rounded-xl" />

      {/* Customers Table Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="h-11 bg-slate-50 border-b border-slate-200 px-4 flex items-center gap-6">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 border-b border-slate-100 px-4 flex items-center gap-6"
          >
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-4 w-36 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

