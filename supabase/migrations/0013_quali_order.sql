-- 0013 — The qualifying classification, on the race it belongs to.
--
-- Players lean on qualifying more than on anything else when they file a top
-- 10, and the site never showed it: `lock_race.py` already fetched the order
-- every fifteen minutes of a race weekend (the model's grid fallback needs
-- it) and threw it away. It is kept now, and the prediction editor orders its
-- driver pool by it.
--
-- Public by nature — it is the result of a session everybody watched — so it
-- sits on `races`, which is already public-read, rather than behind the
-- secrecy `model_entries` has had since 0009. It is the *qualifying* order,
-- not the starting grid: penalties are applied after it, and the site labels
-- it Q1…Qn for that reason.
--
-- Null until the job has read it; an ordered JSON array of driver_ids once it
-- has. Additive and nullable, so the site and the jobs both run either side
-- of it.

alter table public.races
  add column if not exists quali_order jsonb;

comment on column public.races.quali_order is
  'Qualifying classification as an ordered array of driver_ids (pole first), written by jobs/lock_race.py. Null until known. Not the grid: penalties are not applied.';
