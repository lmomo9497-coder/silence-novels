-- =====================================================================
--  روايات صمت — Silence Novels
--  Migration 0005: RPC Functions (عدّادات المشاهدات)
-- =====================================================================

create or replace function public.increment_novel_views(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.novels set views = views + 1 where id = p_id;
$$;

create or replace function public.increment_chapter_views(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.chapters set views = views + 1 where id = p_id;
$$;

grant execute on function public.increment_novel_views(uuid) to anon, authenticated;
grant execute on function public.increment_chapter_views(uuid) to anon, authenticated;
