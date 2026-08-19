
create or replace function get_cloaked_link_validated(p_token text, p_short_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_uid text;
    v_link_url text;
begin
    -- 1. Buscar o dono do token que não está bloqueado e a assinatura não venceu
    select firebase_uid into v_user_uid
    from cloak_users
    where public_token = p_token
      and blocked = false
      and (expires_at is null or expires_at > now());

    if v_user_uid is null then
        return json_build_object('error', 'token_invalid_or_expired');
    end if;

    -- 2. Buscar o link ativo pertencente a esse usuário
    select original_url into v_link_url
    from cloaked_links
    where short_id = p_short_id
      and owner_uid = v_user_uid
      and active = true;

    if v_link_url is null then
        return json_build_object('error', 'link_not_found');
    end if;

    return json_build_object('original_url', v_link_url, 'owner_uid', v_user_uid);
end;
$$;
