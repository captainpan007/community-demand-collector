export default function SettingsLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] animate-pulse">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="mt-8 h-8 w-40 rounded bg-white/10" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="h-64 rounded-lg border border-white/10 bg-white/5" />
          <div className="h-64 rounded-lg border border-white/10 bg-white/5" />
        </div>
      </div>
    </div>
  );
}
