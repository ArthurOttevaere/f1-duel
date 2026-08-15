import NotFoundBody from "@/components/NotFoundBody";

// A `notFound()` thrown anywhere in the site group — an unknown username, a
// round that isn't a race. The group layout supplies the nav and the footer,
// so this only has to be the page.
export const metadata = { title: "Not found" };

export default function SiteNotFound() {
  return <NotFoundBody />;
}
