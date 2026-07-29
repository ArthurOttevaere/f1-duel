// Nav + footer come from the shared (site) layout; this only sets the game
// content width and clears the fixed nav.
export default function GameLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
      {children}
    </main>
  );
}
