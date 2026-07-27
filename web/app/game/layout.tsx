import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function GameLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
