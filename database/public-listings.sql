-- Review and apply through a tested migration before enabling public listings.
-- Publishing is opt-in; all existing properties remain private by default.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale','rent'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_title text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_city text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_rooms numeric(4,1);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_image_url text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS published_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_properties_public ON public.properties (published_at DESC) WHERE is_published = true;
-- Never expose owner_client_id, agent IDs, private notes or internal deal data in public endpoints.
