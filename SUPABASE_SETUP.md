# Supabase Setup Guide

To get **AnonyChat** running, you'll need to link your Supabase project. Carefully follow these exact steps:

## 1. Create a Project
If you haven't already, go to [Supabase](https://supabase.com) and create a new project. Wait for the database to finish provisioning.

## 2. Initialize the Database (CRITICAL)
Your app will not work until you create the necessary tables.
1. In your Supabase Dashboard, look at the left sidebar and click on **SQL Editor** (the icon looks like a code block `[>]`).
2. Click **"+ New query"**.
3. Copy the entire SQL block below, paste it into the editor, and click **"Run"** (bottom right).

```sql
-- 1. CLEANUP (Removes everything if it exists to start fresh)
drop table if exists messages;
drop table if exists channels;
drop table if exists profiles;

-- 2. Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  color text default '#00ff66',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create channels table
create table channels (
  id text primary key,
  name text not null,
  description text
);

-- 4. Insert global channel
insert into channels (id, name, description) 
values ('global', 'Global Nexus', 'The main public data stream.')
on conflict (id) do nothing;

-- 5. Create messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  channel_id text references channels(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) default now()
);

-- 6. Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;

-- 7. Create Security Policies
create policy "Profiles viewable by everyone" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Channels viewable by everyone" on channels for select using (true);

create policy "Messages viewable by everyone" on messages for select using (true);
create policy "Authenticated users insert messages" on messages for insert with check (auth.role() = 'authenticated');

-- 8. Enable Realtime messaging
alter publication supabase_realtime add table messages;

-- 9. Automatic Profile Creation Trigger (ADVANCED)
-- This ensures every new user gets a profile entry automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, color)
  values (new.id, split_part(new.email, '@', 1), '#00ff66');
  return new;
end;
$$ language plpgsql security definer;

-- Only create the trigger if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end $$;
```

## 3. Link to AI Studio
1. In Supabase, go to **Project Settings** (gear icon) > **API**.
2. Find the **Project URL** (must start with `https://`) and the **`anon` public API key**.
3. In **Google AI Studio**, click the **Settings** (gear icon) at the top right.
4. Click **Secrets**.
5. Add two new secrets:
   - Name: `VITE_SUPABASE_URL` | Value: (Your project URL)
   - Name: `VITE_SUPABASE_ANON_KEY` | Value: (Your anon key)
6. **Save** and **Refresh** the app preview.

## 4. Troubleshooting Support
### Immediate Login (No Email Confirmation)
By default, Supabase requires email verification. To skip this:
1. Go to **Authentication** > **Settings**.
2. Look for **Email** under Auth Providers.
3. Disable **Confirm email** and click **Save**.

### Vercel / External Deployment
If messages are not appearing on Vercel:
1. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are added to your **Environment Variables** in the Vercel dashboard.
2. **IMPORTANT**: If you see a "Relationship Not Found" error, you must ensure the `user_id` in your `messages` table references `public.profiles(id)`, not `auth.users(id)`. 
   - Run this fix in the SQL Editor if needed:
     ```sql
     alter table messages drop constraint if exists messages_user_id_fkey;
     alter table messages add constraint messages_user_id_fkey foreign key (user_id) references public.profiles(id);
     ```
3. Check the **Realtime** settings in Supabase:
   - Go to **Database** > **Replication**.
   - Ensure the `supabase_realtime` publication includes the `messages` table.
3. Check **RLS Policies**:
   - Ensure you have applied the `select` policy for messages: `create policy "Messages are viewable by everyone" on messages for select using (true);`.
   - If no policies exist, Supabase blocks all reads by default.
