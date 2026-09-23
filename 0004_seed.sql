-- =====================================================================
--  روايات صمت — Silence Novels
--  Migration 0004: Seed (Roles, Permissions, Categories)
-- =====================================================================

-- الأدوار
insert into public.roles (id, name_ar, name_en, level) values
  ('owner',  'المالك',   'Owner',  100),
  ('staff',  'مشرف',    'Staff',   50),
  ('reader', 'قارئ',    'Reader',  10)
on conflict (id) do update set name_ar = excluded.name_ar, name_en = excluded.name_en, level = excluded.level;

-- الصلاحيات
insert into public.permissions (id, name_ar, name_en, description) values
  ('novels.manage',     'إدارة الروايات',   'Manage novels',     'إنشاء وتعديل وحذف الروايات'),
  ('chapters.manage',   'إدارة الفصول',     'Manage chapters',   'إنشاء وتعديل ونشر الفصول'),
  ('media.manage',      'إدارة الوسائط',    'Manage media',      'رفع وإدارة الصور والصوت'),
  ('categories.manage', 'إدارة التصنيفات',  'Manage categories', 'إدارة التصنيفات والوسوم'),
  ('users.manage',      'إدارة المستخدمين', 'Manage users',      'إدارة المستخدمين والأدوار'),
  ('content.moderate',  'الإشراف على المحتوى','Moderate content','مراجعة المحتوى والبلاغات'),
  ('stats.view',        'عرض الإحصائيات',   'View stats',        'الاطلاع على إحصائيات المنصة')
on conflict (id) do update set name_ar = excluded.name_ar, name_en = excluded.name_en, description = excluded.description;

-- صلاحيات المالك (كل شيء)
insert into public.role_permissions (role_id, permission_id)
select 'owner', id from public.permissions
on conflict do nothing;

-- صلاحيات المشرف الافتراضية
insert into public.role_permissions (role_id, permission_id) values
  ('staff','novels.manage'),
  ('staff','chapters.manage'),
  ('staff','media.manage'),
  ('staff','content.moderate'),
  ('staff','stats.view')
on conflict do nothing;

-- التصنيفات (نظيفة، بلا أي محتوى إباحي)
insert into public.categories (slug, name_ar, name_en, position) values
  ('fantasy',        'فانتازيا',        'Fantasy',        1),
  ('mystery',        'غموض',            'Mystery',        2),
  ('horror',         'رعب',             'Horror',         3),
  ('drama',          'دراما',           'Drama',          4),
  ('romance',        'رومانسية',        'Romance',        5),
  ('thriller',       'إثارة',           'Thriller',       6),
  ('psychological',  'نفسي',            'Psychological',  7),
  ('action',         'أكشن',            'Action',         8),
  ('adventure',      'مغامرة',          'Adventure',      9),
  ('historical',     'تاريخي',          'Historical',     10),
  ('supernatural',   'خارق للطبيعة',    'Supernatural',   11),
  ('dark-fantasy',   'فانتازيا مظلمة',  'Dark Fantasy',   12),
  ('comedy',         'كوميديا',         'Comedy',         13),
  ('school',         'مدرسي',           'School',         14),
  ('crime',          'جريمة',           'Crime',          15),
  ('slice-of-life',  'شريحة من الحياة', 'Slice of Life',  16)
on conflict (slug) do update set name_ar = excluded.name_ar, name_en = excluded.name_en, position = excluded.position;
