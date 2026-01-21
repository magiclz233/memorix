export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-32 rounded bg-zinc-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}
