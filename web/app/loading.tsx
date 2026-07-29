import RaceLoader from "@/components/RaceLoader";

// Fallback loader for routes without a closer loading boundary (home, /model,
// /rules, /profile). The game section has its own nav-visible variant.
export default function Loading() {
  return <RaceLoader />;
}
