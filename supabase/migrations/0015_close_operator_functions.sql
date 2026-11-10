-- 0015 — The operator functions were callable with the public key.
--
-- Found 2026-11-10 while testing the recap mail: `email_recipients` answered
-- a request signed with the **anon** key — the one shipped to every browser —
-- with every player's address and unsubscribe token. The catalog said the
-- same of the whole operator set:
--
--   has_function_privilege('anon', 'admin_delete_player(text)', 'execute') = true
--
-- so anybody could list the players' emails (`admin_players`,
-- `email_recipients`), delete any account by username
-- (`admin_delete_player`), or zero the model's season (`admin_model_*`).
--
-- Why: migrations 0006 and 0008 closed these with
-- `revoke all on function … from public`, which is how you close a function
-- in plain Postgres. It is not enough on Supabase. The platform's default
-- privileges grant EXECUTE on every new function in `public` to `anon` and
-- `authenticated` **by name**, and a revoke from the pseudo-role PUBLIC does
-- not touch a grant made to a named role. The functions are `security
-- definer`, so once called they run as their owner and RLS is no help.
--
-- The rule from here on, for any function that is not meant for the browser:
--
--   revoke all on function f(...) from public, anon, authenticated;
--
-- Nothing the site does changes: the jobs call these as `service_role`, which
-- keeps its grant, and the web app never called them.

revoke all on function public.admin_model_status(int)          from public, anon, authenticated;
revoke all on function public.admin_model_reset(int)           from public, anon, authenticated;
revoke all on function public.admin_model_count_from(int, int) from public, anon, authenticated;
revoke all on function public.admin_model_restore(int)         from public, anon, authenticated;
revoke all on function public.admin_players()                  from public, anon, authenticated;
revoke all on function public.admin_delete_player(text)        from public, anon, authenticated;
revoke all on function public.email_recipients(bigint, text)   from public, anon, authenticated;

-- A signed-out caller has no account to delete; the function is for
-- `authenticated` alone, as 0003 intended.
revoke all on function public.delete_account() from public, anon;

grant execute on function public.admin_model_status(int)          to service_role;
grant execute on function public.admin_model_reset(int)           to service_role;
grant execute on function public.admin_model_count_from(int, int) to service_role;
grant execute on function public.admin_model_restore(int)         to service_role;
grant execute on function public.admin_players()                  to service_role;
grant execute on function public.admin_delete_player(text)        to service_role;
grant execute on function public.email_recipients(bigint, text)   to service_role;
grant execute on function public.delete_account()                 to authenticated, service_role;
