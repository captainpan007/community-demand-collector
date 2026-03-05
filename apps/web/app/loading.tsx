export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] animate-pulse">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-48 rounded bg-white/10" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="mt-4 h-32 rounded-lg border border-white/10 bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
