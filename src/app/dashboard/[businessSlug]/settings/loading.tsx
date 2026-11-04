export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-7 w-52 bg-slate-200 rounded-lg" />
          <div className="h-4 w-80 bg-slate-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-slate-200 rounded-xl" />
      </div>

      {/* Tabs Strip Skeleton */}
      <div className="border-b border-slate-200 pb-2">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            "Profile",
            "Hours",
            "Holidays",
            "Policies",
            "Notifications",
            "Google Cal",
            "AI Assistant",
            "Widget",
            "WhatsApp",
          ].map((name, i) => (
            <div
              key={name}
              className={`h-9 rounded-lg shrink-0 ${
                i === 0 ? "w-32 bg-slate-900/10" : "w-24 bg-slate-100"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Settings Form Card Skeleton */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 shadow-xs">
        <div className="space-y-2 border-b border-slate-100 pb-4">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-3.5 w-64 bg-slate-100 rounded" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <div className="h-10 w-32 bg-blue-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

