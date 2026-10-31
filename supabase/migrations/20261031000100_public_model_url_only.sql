-- Public tracking needs the model asset URL, but should not expose admin names or access codes.
revoke select on table public.live2d_models from anon;
grant select (cloudflare_url, created_at) on table public.live2d_models to anon;
