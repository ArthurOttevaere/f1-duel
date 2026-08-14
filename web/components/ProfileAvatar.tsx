"use client";

import { useState } from "react";
import { driverPhoto } from "@/lib/format";
import { tint } from "@/lib/teams";

/**
 * The face of a profile: the portrait of the driver that player backed for the
 * title, ringed in their constructor's colour.
 *
 * Falls back to a monogram of the username — for a player who hasn't made a
 * championship pick yet, and for a driver the `public/drivers` folder has no
 * portrait for (a rookie called up mid-season, most likely). The fallback is
 * the same disc at the same size, so the header never reflows around it.
 */
export default function ProfileAvatar({
  driverId,
  username,
  color,
  size = 128,
}: {
  driverId: string | null;
  username: string;
  color: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const showPhoto = driverId !== null && !broken;

  return (
    <span
      className="relative flex shrink-0 items-end justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        // Sits on the cover, so it needs an opaque backing of its own before
        // the tint goes on top — otherwise a transparent portrait shows the
        // banner gradient through the head.
        background: `var(--color-bg) linear-gradient(180deg, ${tint(color, 0.32)}, ${tint(color, 0.08)})`,
        boxShadow: `0 0 0 4px var(--color-bg), 0 0 0 6px ${tint(color, 0.75)}, 0 12px 32px rgb(0 0 0 / 0.5)`,
      }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- local asset, tiny
        <img
          src={driverPhoto(driverId)}
          alt=""
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-mono font-bold uppercase"
          style={{ color, fontSize: size * 0.34 }}
        >
          {username.slice(0, 2)}
        </span>
      )}
    </span>
  );
}
