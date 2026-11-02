revoke all on function private.is_whole_school_classroom_member(uuid) from public, anon;
grant execute on function private.is_whole_school_classroom_member(uuid) to authenticated;
revoke all on function private.is_classroom_member(uuid) from public, anon;
grant execute on function private.is_classroom_member(uuid) to authenticated;
