/**
 * Each circuit's IANA time zone, keyed by Jolpica's `circuitId`.
 *
 * The calendar gives a UTC instant and a latitude, never a zone, and "track
 * time" has to be right on both sides of a daylight-saving change — so it is
 * a zone, not an offset. OpenF1 does carry a `gmt_offset` per session, but the
 * schedule must not depend on a second API to say what time it is in Austin.
 *
 * A venue missing here is not an error: the schedule falls back to UTC for
 * track time and says so. Add the line when the calendar gains a circuit.
 */
const ZONES: Record<string, string> = {
  albert_park: "Australia/Melbourne",
  shanghai: "Asia/Shanghai",
  suzuka: "Asia/Tokyo",
  bahrain: "Asia/Bahrain",
  jeddah: "Asia/Riyadh",
  miami: "America/New_York",
  villeneuve: "America/Toronto",
  monaco: "Europe/Monaco",
  catalunya: "Europe/Madrid",
  madring: "Europe/Madrid",
  red_bull_ring: "Europe/Vienna",
  silverstone: "Europe/London",
  spa: "Europe/Brussels",
  hungaroring: "Europe/Budapest",
  zandvoort: "Europe/Amsterdam",
  monza: "Europe/Rome",
  imola: "Europe/Rome",
  baku: "Asia/Baku",
  sepang: "Asia/Kuala_Lumpur",
  marina_bay: "Asia/Singapore",
  americas: "America/Chicago",
  rodriguez: "America/Mexico_City",
  interlagos: "America/Sao_Paulo",
  vegas: "America/Los_Angeles",
  losail: "Asia/Qatar",
  yas_marina: "Asia/Dubai",
};

export function circuitTimeZone(circuitId: string): string | null {
  return ZONES[circuitId] ?? null;
}
