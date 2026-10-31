-- Replace public URL access with model-code listing and password-gated lookup.
revoke select on table public.live2d_models from anon;
grant select (code, created_at) on table public.live2d_models to anon;

create or replace function public.get_live2d_model_for_access(
  p_code text,
  p_password text
)
returns table (cloudflare_url text)
language sql
security definer
set search_path = ''
as $$
  select m.cloudflare_url
  from public.live2d_models as m
  where m.enabled = true
    and m.code = p_code
    and m.name = p_password
  limit 1;
$$;

revoke all on function public.get_live2d_model_for_access(text, text) from public, anon, authenticated;
grant execute on function public.get_live2d_model_for_access(text, text) to anon;

