// Shown instantly on navigation while the server component streams in, so a
// click feels immediate even when Supabase round-trips take a moment.
export default function GameLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden>
      <div className="glass-card h-28 p-6" />
      <div className="glass-card h-12 p-4" />
      <div className="glass-card h-96 p-6" />
    </div>
  );
}
