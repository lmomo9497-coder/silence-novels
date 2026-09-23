-- =====================================================================
--  روايات صمت — Silence Novels
--  Migration 0002: Row Level Security
-- =====================================================================

alter table public.roles             enable row level security;
alter table public.permissions       enable row level security;
alter table public.role_permissions  enable row level security;
alter table public.user_permissions  enable row level security;
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.tags              enable row level security;
alter table public.novels            enable row level security;
alter table public.novel_tags        enable row level security;
alter table public.chapters          enable row level security;
alter table public.chapter_blocks    enable row level security;
alter table public.characters        enable row level security;
alter table public.media             enable row level security;
alter table public.audio_tracks      enable row level security;
alter table public.favorites         enable row level security;
alter table public.reading_progress  enable row level security;
alter table public.reading_history   enable row level security;
alter table public.notifications     enable row level security;

-- ---------------------------------------------------------------------
-- منع تصعيد الصلاحيات: لا يمكن تغيير الدور إلا بواسطة المالك
-- ---------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_owner() then
    raise exception 'تغيير الأدوار متاح للمالك فقط';
  end if;
  if new.is_banned is distinct from old.is_banned and not public.is_owner() then
    raise exception 'حظر المستخدمين متاح للمالك فقط';
  end if;
  return new;
end; $$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------------------------------------------------------------------
-- دوال مساعدة للتحقق من ملكية الرواية
-- ---------------------------------------------------------------------
create or replace function public.owns_novel(nid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.novels n where n.id = nid and n.author_id = auth.uid());
$$;

create or replace function public.can_manage_novel(nid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or public.has_permission('novels.manage') or public.owns_novel(nid);
$$;

-- =====================================================================
-- ROLES / PERMISSIONS  (قراءة عامة، إدارة للمالك)
-- =====================================================================
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select using (true);
drop policy if exists roles_admin on public.roles;
create policy roles_admin on public.roles for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists perms_read on public.permissions;
create policy perms_read on public.permissions for select using (true);
drop policy if exists perms_admin on public.permissions;
create policy perms_admin on public.permissions for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists role_perms_read on public.role_permissions;
create policy role_perms_read on public.role_permissions for select using (true);
drop policy if exists role_perms_admin on public.role_permissions;
create policy role_perms_admin on public.role_permissions for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists user_perms_read on public.user_permissions;
create policy user_perms_read on public.user_permissions for select using (public.is_owner() or user_id = auth.uid());
drop policy if exists user_perms_admin on public.user_permissions;
create policy user_perms_admin on public.user_permissions for all using (public.is_owner()) with check (public.is_owner());

-- =====================================================================
-- PROFILES
-- =====================================================================
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

-- =====================================================================
-- CATEGORIES / TAGS
-- =====================================================================
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all
  using (public.is_staff() or public.has_permission('categories.manage'))
  with check (public.is_staff() or public.has_permission('categories.manage'));

drop policy if exists tags_read on public.tags;
create policy tags_read on public.tags for select using (true);
drop policy if exists tags_admin on public.tags;
create policy tags_admin on public.tags for all
  using (public.is_staff() or public.has_permission('novels.manage'))
  with check (public.is_staff() or public.has_permission('novels.manage'));

-- =====================================================================
-- NOVELS
-- =====================================================================
drop policy if exists novels_read on public.novels;
create policy novels_read on public.novels for select
  using (is_published = true or public.can_manage_novel(id));

drop policy if exists novels_insert on public.novels;
create policy novels_insert on public.novels for insert
  with check (auth.uid() is not null and author_id = auth.uid());

drop policy if exists novels_update on public.novels;
create policy novels_update on public.novels for update
  using (public.can_manage_novel(id))
  with check (public.can_manage_novel(id));

drop policy if exists novels_delete on public.novels;
create policy novels_delete on public.novels for delete
  using (public.can_manage_novel(id));

-- NOVEL_TAGS
drop policy if exists novel_tags_read on public.novel_tags;
create policy novel_tags_read on public.novel_tags for select using (true);
drop policy if exists novel_tags_write on public.novel_tags;
create policy novel_tags_write on public.novel_tags for all
  using (public.can_manage_novel(novel_id))
  with check (public.can_manage_novel(novel_id));

-- =====================================================================
-- CHAPTERS
-- =====================================================================
drop policy if exists chapters_read on public.chapters;
create policy chapters_read on public.chapters for select
  using (
    (is_published = true and exists (select 1 from public.novels n where n.id = novel_id and n.is_published))
    or public.can_manage_novel(novel_id)
  );

drop policy if exists chapters_write on public.chapters;
create policy chapters_write on public.chapters for all
  using (public.can_manage_novel(novel_id))
  with check (public.can_manage_novel(novel_id));

-- =====================================================================
-- CHAPTER BLOCKS
-- =====================================================================
drop policy if exists blocks_read on public.chapter_blocks;
create policy blocks_read on public.chapter_blocks for select
  using (
    exists (
      select 1 from public.chapters c
      join public.novels n on n.id = c.novel_id
      where c.id = chapter_id and c.is_published and n.is_published
    )
    or exists (
      select 1 from public.chapters c
      where c.id = chapter_id and public.can_manage_novel(c.novel_id)
    )
  );

drop policy if exists blocks_write on public.chapter_blocks;
create policy blocks_write on public.chapter_blocks for all
  using (exists (select 1 from public.chapters c where c.id = chapter_id and public.can_manage_novel(c.novel_id)))
  with check (exists (select 1 from public.chapters c where c.id = chapter_id and public.can_manage_novel(c.novel_id)));

-- =====================================================================
-- CHARACTERS  (قراءة عامة لعرض الألوان للقارئ)
-- =====================================================================
drop policy if exists characters_read on public.characters;
create policy characters_read on public.characters for select using (true);
drop policy if exists characters_write on public.characters;
create policy characters_write on public.characters for all
  using (public.can_manage_novel(novel_id))
  with check (public.can_manage_novel(novel_id));

-- =====================================================================
-- MEDIA / AUDIO
-- =====================================================================
drop policy if exists media_read on public.media;
create policy media_read on public.media for select using (true);
drop policy if exists media_write on public.media;
create policy media_write on public.media for all
  using (public.can_manage_novel(novel_id))
  with check (public.can_manage_novel(novel_id));

drop policy if exists audio_read on public.audio_tracks;
create policy audio_read on public.audio_tracks for select using (true);
drop policy if exists audio_write on public.audio_tracks;
create policy audio_write on public.audio_tracks for all
  using (public.can_manage_novel(novel_id))
  with check (public.can_manage_novel(novel_id));

-- =====================================================================
-- FAVORITES / PROGRESS / HISTORY  (خاصة بالمستخدم)
-- =====================================================================
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists progress_own on public.reading_progress;
create policy progress_own on public.reading_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists history_own on public.reading_history;
create policy history_own on public.reading_history for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
