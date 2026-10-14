-- Phase 5: invitations table (drafts + saved invitations per user).
create extension if not exists pgcrypto;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  design_id text not null,
  -- User-facing name shown in "My invitations"; defaults to the design's
  -- title at creation and can be renamed independently of config.
  title text not null default 'Untitled invitation',
  config jsonb not null default '{}'::jsonb,
  -- Short, unguessable id for the future public /i/<short-id> link. Generated
  -- now (Phase 5); no public route reads it yet (that's Phase 6).
  short_id text not null unique default encode(gen_random_bytes(5), 'hex'),
  status text not null default 'draft' check (status in ('draft', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invitations_user_id_idx on public.invitations (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invitations_set_updated_at
before update on public.invitations
for each row
execute function public.set_updated_at();

alter table public.invitations enable row level security;

create policy "Users can view their own invitations"
on public.invitations for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their own invitations"
on public.invitations for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own invitations"
on public.invitations for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own invitations"
on public.invitations for delete
to authenticated
using (user_id = auth.uid());
