/**
 * The page itself is a client component, which cannot export `metadata` — so
 * the tab said "F1 Duel — Beat the model" on the one screen where somebody is
 * about to switch to their mail and come back looking for it.
 */
export const metadata = { title: "Sign in" };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
