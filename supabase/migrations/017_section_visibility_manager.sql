-- Section Visibility Manager: per-section show/hide, enable, lock, order, schedule

ALTER TABLE public.homepage_content
  ADD COLUMN IF NOT EXISTS section_manager JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.homepage_content.section_manager IS
  'Homepage Section Visibility Manager: ordered sections with visible, enabled, locked, schedule fields.';

-- Backfill section_manager from legacy section_visibility when empty
UPDATE public.homepage_content
SET section_manager = jsonb_build_object(
  'version', 1,
  'sections', jsonb_build_array(
    jsonb_build_object('id','hero','type','hero','visible',COALESCE((section_visibility->>'hero')::boolean, true),'enabled',true,'locked',false,'order',0,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','stats','type','stats','visible',COALESCE((section_visibility->>'stats')::boolean, true),'enabled',true,'locked',false,'order',1,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','why_choose_us','type','why_choose_us','visible',COALESCE((section_visibility->>'why_choose_us')::boolean, true),'enabled',true,'locked',false,'order',2,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','products','type','products','visible',COALESCE((section_visibility->>'featured_products')::boolean, true),'enabled',true,'locked',false,'order',3,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','categories','type','categories','visible',COALESCE((section_visibility->>'categories')::boolean, true),'enabled',true,'locked',false,'order',4,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','gallery','type','gallery','visible',COALESCE((section_visibility->>'gallery')::boolean, true),'enabled',true,'locked',false,'order',5,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','projects','type','projects','visible',COALESCE((section_visibility->>'projects')::boolean, true),'enabled',true,'locked',false,'order',6,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','about','type','about','visible',COALESCE((section_visibility->>'about')::boolean, true),'enabled',true,'locked',false,'order',7,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','testimonials','type','testimonials','visible',COALESCE((section_visibility->>'testimonials')::boolean, true),'enabled',true,'locked',false,'order',8,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','quote','type','quote','visible',COALESCE((section_visibility->>'quote')::boolean, true),'enabled',true,'locked',false,'order',9,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','contact','type','contact','visible',COALESCE((section_visibility->>'contact')::boolean, true),'enabled',true,'locked',false,'order',10,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','contact_cta','type','contact_cta','visible',COALESCE((section_visibility->>'contact_cta')::boolean, true),'enabled',true,'locked',false,'order',11,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','ai_assistant','type','ai_assistant','visible',true,'enabled',true,'locked',false,'order',12,'scheduled_publish_at',null,'scheduled_unpublish_at',null),
    jsonb_build_object('id','footer','type','footer','visible',COALESCE((section_visibility->>'footer')::boolean, true),'enabled',true,'locked',false,'order',13,'scheduled_publish_at',null,'scheduled_unpublish_at',null)
  )
)
WHERE section_manager = '{}'::jsonb OR section_manager IS NULL;

NOTIFY pgrst, 'reload schema';
