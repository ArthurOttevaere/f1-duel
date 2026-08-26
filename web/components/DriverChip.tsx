"use client";

import { useState } from "react";
import { driverPhoto } from "@/lib/format";
import { driverColor, tint } from "@/lib/teams";
import type { Driver } from "@/lib/types";

/**
 * All the avatar needs: a photo to look up, a code to fall back to, and
 * whatever is known about the constructor colour. Narrower than `Driver` on
 * purpose — the probability grid holds a matrix, not a roster row, and copying
 * a full driver record into it just to draw a 26px circle would be theatre.
 */
export type AvatarDriver = Pick<Driver, "driver_id" | "code"> &
  Partial<Pick<Driver, "team" | "team_color">>;

export function DriverAvatar({
  driver,
  size = 36,
}: {
  driver: AvatarDriver;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const color = driverColor(driver);
  const wash = tint(color, 0.2);

  if (broken) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full font-mono text-[0.6rem] font-bold"
        style={{
          width: size,
          height: size,
          background: wash,
          color,
        }}
      >
        {driver.code}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local asset, tiny
    <img
      src={driverPhoto(driver.driver_id)}
      alt=""
      width={size}
      height={size}
      // The pool is twenty-two of these at once, and on a phone it lives inside
      // a sheet that starts closed — so none of them is worth blocking on.
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-full object-cover"
      style={{ background: wash, width: size, height: size }}
    />
  );
}
