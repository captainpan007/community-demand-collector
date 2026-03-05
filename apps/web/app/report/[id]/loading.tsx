export default function ReportLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] animate-pulse">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-4 w-24 rounded bg-white/10" />
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-6">
          <div className="h-6 w-64 rounded bg-white/10" />
          <div className="mt-2 h-4 w-40 rounded bg-white/10" />
          <div className="mt-6 h-48 rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}
