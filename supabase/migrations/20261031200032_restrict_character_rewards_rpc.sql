revoke all on function public.dh_claim_daily_game(text) from public, anon;
grant execute on function public.dh_claim_daily_game(text) to authenticated;
revoke all on function public.dh_open_character_pack(text) from public, anon;
grant execute on function public.dh_open_character_pack(text) to authenticated;
