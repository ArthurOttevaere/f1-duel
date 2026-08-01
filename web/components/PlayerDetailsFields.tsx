"use client";

import { COUNTRIES, isCountryCode } from "@/lib/countries";

/** What the sign-up form and /welcome both collect. Strings: these are inputs. */
export interface Details {
  firstName: string;
  lastName: string;
  country: string;
  birthYear: string;
}

export const EMPTY_DETAILS: Details = {
  firstName: "",
  lastName: "",
  country: "",
  birthYear: "",
};

/** Nobody under 13 — the age below which consent isn't the player's to give. */
export const MIN_AGE = 13;
export const MIN_BIRTH_YEAR = 1900;
export const MAX_BIRTH_YEAR = new Date().getFullYear() - MIN_AGE;

/**
 * Validation shared by both entry points, so the rule can't drift between the
 * sign-up form and the one OAuth players see. Returns a message, or null.
 */
export function detailsError(d: Details): string | null {
  if (!d.firstName.trim() || !d.lastName.trim())
    return "Enter your first and last name.";
  if (d.firstName.trim().length > 60 || d.lastName.trim().length > 60)
    return "Names are limited to 60 characters.";
  if (d.country && !isCountryCode(d.country)) return "Pick a country from the list.";
  if (d.birthYear) {
    const year = Number(d.birthYear);
    if (!Number.isInteger(year) || year < MIN_BIRTH_YEAR || year > MAX_BIRTH_YEAR)
      return `Enter a birth year between ${MIN_BIRTH_YEAR} and ${MAX_BIRTH_YEAR}.`;
  }
  return null;
}

/** The shape the database wants: trimmed, uppercased, nulls for the blanks. */
export function detailsPayload(d: Details) {
  return {
    first_name: d.firstName.trim(),
    last_name: d.lastName.trim(),
    country: d.country ? d.country.toUpperCase() : null,
    birth_year: d.birthYear ? Number(d.birthYear) : null,
  };
}

const FIELD =
  "w-full rounded-xl border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi";

/**
 * First/last name (required), country and birth year (optional). Controlled so
 * the parent owns submission — this only draws the inputs.
 */
export default function PlayerDetailsFields({
  value,
  onChange,
  disabled = false,
}: {
  value: Details;
  onChange: (next: Details) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<Details>) => onChange({ ...value, ...patch });

  return (
    <>
      <div className="flex gap-3">
        <input
          type="text"
          required
          disabled={disabled}
          autoComplete="given-name"
          maxLength={60}
          value={value.firstName}
          onChange={(e) => set({ firstName: e.target.value })}
          placeholder="First name"
          className={FIELD}
        />
        <input
          type="text"
          required
          disabled={disabled}
          autoComplete="family-name"
          maxLength={60}
          value={value.lastName}
          onChange={(e) => set({ lastName: e.target.value })}
          placeholder="Last name"
          className={FIELD}
        />
      </div>

      <div className="flex gap-3">
        <select
          disabled={disabled}
          autoComplete="country"
          value={value.country}
          onChange={(e) => set({ country: e.target.value })}
          className={`${FIELD} ${value.country ? "" : "text-ink-mute"}`}
        >
          <option value="">Country (optional)</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="text-black">
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="numeric"
          disabled={disabled}
          min={MIN_BIRTH_YEAR}
          max={MAX_BIRTH_YEAR}
          step={1}
          value={value.birthYear}
          onChange={(e) => set({ birthYear: e.target.value })}
          placeholder="Birth year"
          className={`${FIELD} w-32 shrink-0`}
        />
      </div>
    </>
  );
}
