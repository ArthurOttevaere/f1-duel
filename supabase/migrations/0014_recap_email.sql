-- 0014 — A third kind of email: the season recap is open.
--
-- `email_log.kind` was checked against ('lock', 'result'), the two mails a
-- Grand Prix sends. The season sends one more, once: when the championship
-- picks are paid and `/profile/<name>/season` opens (jobs/settle_season.py).
-- It is logged like the others, against the **last race of the season** — a
-- season has no row of its own, and its recap belongs to its final flag.
--
-- Nothing else changes: `email_recipients(race_id, kind)` already takes any
-- kind and already excludes whoever is in the log for it.
--
-- Until this has run the job sends no recap mail at all rather than risk
-- sending it every hour: it writes the log row *before* each send, and a
-- rejected row stops the batch (jobs/mailer.py#send_recap_emails).

alter table public.email_log
  drop constraint if exists email_log_kind_check;

alter table public.email_log
  add constraint email_log_kind_check
  check (kind in ('lock', 'result', 'recap'));
