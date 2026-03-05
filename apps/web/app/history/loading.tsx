export default function HistoryLoading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] animate-pulse">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 p-4">
            <div className="h-4 w-32 rounded bg-white/10" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex gap-4 border-b border-white/5 p-4"
            >
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="h-4 w-16 rounded bg-white/10" />
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="ml-auto h-4 w-12 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
