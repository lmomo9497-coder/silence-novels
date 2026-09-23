-- =====================================================================
--  روايات صمت — Silence Novels
--  Migration 0001: Core Schema
--  مشروع مستقل بالكامل. لا يعتمد على أي مشروع سابق.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) الأدوار والصلاحيات (Roles & Permissions)
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  id          text primary key,               -- owner | staff | reader
  name_ar     text not null,
  name_en     text not null,
  level       int  not null default 0,        -- owner=100, staff=50, reader=10
  created_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  id          text primary key,               -- e.g. novels.manage
  name_ar     text not null,
  name_en     text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id       text not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- منح صلاحيات إضافية لموظف بعينه (يمنحها المالك فقط)
create table if not exists public.user_permissions (
  user_id       uuid not null references auth.users(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  granted_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  primary key (user_id, permission_id)
);

-- ---------------------------------------------------------------------
-- 2) الملفات الشخصية (Profiles)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  role         text not null default 'reader' references public.roles(id),
  is_banned    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) التصنيفات والوسوم (Categories & Tags)
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_ar     text not null,
  name_en     text not null,
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4) الروايات (Novels)
-- ---------------------------------------------------------------------
create table if not exists public.novels (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  author_name    text not null,
  author_id      uuid references public.profiles(id) on delete set null,
  description    text,
  language       text not null default 'ar',   -- ar | en | ko | ja | ...
  direction      text not null default 'rtl' check (direction in ('rtl','ltr')),
  category_id    uuid references public.categories(id) on delete set null,
  status         text not null default 'ongoing' check (status in ('ongoing','completed')),
  cover_url      text,
  is_published   boolean not null default false,
  is_flagged     boolean not null default false,   -- للإشراف على المحتوى
  views          bigint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_chapter_at timestamptz
);

create table if not exists public.novel_tags (
  novel_id uuid not null references public.novels(id) on delete cascade,
  tag_id   uuid not null references public.tags(id) on delete cascade,
  primary key (novel_id, tag_id)
);

-- ---------------------------------------------------------------------
-- 5) الفصول (Chapters)
-- ---------------------------------------------------------------------
create table if not exists public.chapters (
  id             uuid primary key default gen_random_uuid(),
  novel_id       uuid not null references public.novels(id) on delete cascade,
  chapter_number numeric not null default 1,
  title          text not null default '',
  slug           text not null,
  is_published   boolean not null default false,
  published_at   timestamptz,
  views          bigint not null default 0,
  access_type    text not null default 'free' check (access_type in ('free','paid')),
  price          numeric not null default 0,       -- جاهز للدفع مستقبلًا
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (novel_id, slug)
);

create index if not exists chapters_novel_idx on public.chapters(novel_id, chapter_number);

-- ---------------------------------------------------------------------
-- 6) بلوكات الفصل (Chapter Blocks) — المحتوى المنظّم
-- ---------------------------------------------------------------------
create table if not exists public.chapter_blocks (
  id         uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  type       text not null check (type in ('text','heading','image','gif','audio','quote','divider')),
  content    text,                                  -- html للنص، أو url للوسائط
  position   int not null default 0,
  metadata   jsonb not null default '{}'::jsonb,    -- alt, caption, audio_name, media_id, align, size, level...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chapter_blocks_chapter_idx on public.chapter_blocks(chapter_id, position);

-- ---------------------------------------------------------------------
-- 7) الشخصيات وألوانها (Characters)
-- ---------------------------------------------------------------------
create table if not exists public.characters (
  id         uuid primary key default gen_random_uuid(),
  novel_id   uuid not null references public.novels(id) on delete cascade,
  name       text not null,
  color      text not null default '#c8912f',
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists characters_novel_idx on public.characters(novel_id, position);

-- ---------------------------------------------------------------------
-- 8) الوسائط (Media: صور + GIF) والصوت (Audio Tracks)
-- ---------------------------------------------------------------------
create table if not exists public.media (
  id         uuid primary key default gen_random_uuid(),
  novel_id   uuid not null references public.novels(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  owner_id   uuid references public.profiles(id) on delete set null,
  type       text not null default 'image' check (type in ('image','gif')),
  bucket     text not null default 'chapter-media',
  path       text not null,
  url        text not null,
  name       text,
  mime_type  text,
  size_bytes bigint,
  metadata   jsonb not null default '{}'::jsonb,   -- width, height
  created_at timestamptz not null default now()
);

create index if not exists media_novel_idx on public.media(novel_id, type);

create table if not exists public.audio_tracks (
  id         uuid primary key default gen_random_uuid(),
  novel_id   uuid not null references public.novels(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  owner_id   uuid references public.profiles(id) on delete set null,
  name       text not null default 'مقطع صوتي',
  bucket     text not null default 'audio',
  path       text not null,
  url        text not null,
  mime_type  text,
  size_bytes bigint,
  duration   numeric,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audio_novel_idx on public.audio_tracks(novel_id);

-- ---------------------------------------------------------------------
-- 9) المفضلة وسجل القراءة والتقدم (Favorites / History / Progress)
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  novel_id   uuid not null references public.novels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table if not exists public.reading_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  novel_id       uuid not null references public.novels(id) on delete cascade,
  chapter_id     uuid references public.chapters(id) on delete set null,
  scroll_percent numeric not null default 0,
  block_index    int not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table if not exists public.reading_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  novel_id   uuid not null references public.novels(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  read_at    timestamptz not null default now()
);

create index if not exists history_user_idx on public.reading_history(user_id, read_at desc);

-- ---------------------------------------------------------------------
-- 10) الإشعارات (Notifications) — جاهزة للإصدارات القادمة
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null default 'system',
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 11) الدوال المساعدة (Helper functions)
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'reader');
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() = 'owner'; $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() in ('owner','staff'); $$;

create or replace function public.has_permission(perm text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.is_owner()
    or exists (
      select 1
      from public.profiles p
      join public.role_permissions rp on rp.role_id = p.role
      where p.id = auth.uid() and rp.permission_id = perm
    )
    or exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission_id = perm
    );
$$;

-- ---------------------------------------------------------------------
-- 12) تحديث updated_at تلقائيًا
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_novels_touch on public.novels;
create trigger trg_novels_touch before update on public.novels
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_chapters_touch on public.chapters;
create trigger trg_chapters_touch before update on public.chapters
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_blocks_touch on public.chapter_blocks;
create trigger trg_blocks_touch before update on public.chapter_blocks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 13) إنشاء ملف شخصي تلقائيًا عند التسجيل
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    null
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 14) تحديث آخر فصل عند نشر فصل جديد
-- ---------------------------------------------------------------------
create or replace function public.touch_novel_last_chapter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published then
    update public.novels
      set last_chapter_at = coalesce(new.published_at, now())
      where id = new.novel_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_chapter_publish on public.chapters;
create trigger trg_chapter_publish after insert or update on public.chapters
  for each row execute function public.touch_novel_last_chapter();
