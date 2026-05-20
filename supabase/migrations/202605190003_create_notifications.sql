create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_read_idx
  on public.notifications (user_id, read);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create or replace function public.create_property_inquiry_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  property_title text;
begin
  select title
  into property_title
  from public.properties
  where id = new.property_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.landlord_id,
    'property_inquiry',
    'New property inquiry',
    'A tenant asked about ' || coalesce(property_title, 'your property') || '.',
    '/messages/' || new.id
  );

  return new;
end;
$$;

drop trigger if exists on_conversation_created_notify_landlord on public.conversations;
create trigger on_conversation_created_notify_landlord
  after insert on public.conversations
  for each row
  execute function public.create_property_inquiry_notification();

create or replace function public.create_new_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conversation_record public.conversations%rowtype;
  recipient_id uuid;
begin
  select *
  into conversation_record
  from public.conversations
  where id = new.conversation_id;

  if conversation_record.id is null then
    return new;
  end if;

  recipient_id := case
    when new.sender_id = conversation_record.tenant_id then conversation_record.landlord_id
    else conversation_record.tenant_id
  end;

  if recipient_id is not null and recipient_id <> new.sender_id then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      recipient_id,
      'message',
      'New message',
      left(new.message, 160),
      '/messages/' || new.conversation_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_created_notify_recipient on public.messages;
create trigger on_message_created_notify_recipient
  after insert on public.messages
  for each row
  execute function public.create_new_message_notification();
