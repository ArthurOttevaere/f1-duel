import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

// Shared chrome for every public/game page. Living here (not in each page) means
// the nav and footer stay mounted across navigations — only the page content
// swaps, so the nav never flashes away into a blank screen during loading.
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteNav />
      {/* The skip link's target (app/layout.tsx). Every page of the group
          renders its own <main> inside this. */}
      <div id="content" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
