import { redirect } from "next/navigation";

/**
 * Leagues no longer have a page of their own — the standings filter is the
 * league, and everything you could do here (create, join, invite, leave,
 * delete) happens beside the board it belongs to.
 *
 * The route stays as a redirect: invite links, bookmarks and the messages
 * players already sent each other all point at it.
 */
export default function LeaguesPage() {
  redirect("/game/standings");
}
