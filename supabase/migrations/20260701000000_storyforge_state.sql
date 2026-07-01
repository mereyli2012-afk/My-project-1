create table if not exists public.storyforge_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.storyforge_states enable row level security;

create policy "read own storyforge state"
  on public.storyforge_states for select
  using (auth.uid() = user_id);

create policy "insert own storyforge state"
  on public.storyforge_states for insert
  with check (auth.uid() = user_id);

create policy "update own storyforge state"
  on public.storyforge_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_storyforge_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_storyforge_state_updated_at on public.storyforge_states;

create trigger set_storyforge_state_updated_at
before update on public.storyforge_states
for each row
execute function public.set_storyforge_state_updated_at();
