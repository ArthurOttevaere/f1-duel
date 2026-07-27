"use client";

import { useState } from "react";
import { driverPhoto } from "@/lib/format";
import type { Driver } from "@/lib/types";

export function DriverAvatar({
  driver,
  size = 36,
}: {
  driver: Driver;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const color = driver.team_color ?? "#6c7280";

  if (broken) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full font-mono text-[0.6rem] font-bold"
        style={{
          width: size,
          height: size,
          background: `${color}33`,
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
      onError={() => setBroken(true)}
      className="shrink-0 rounded-full object-cover"
      style={{ background: `${color}33`, width: size, height: size }}
    />
  );
}
