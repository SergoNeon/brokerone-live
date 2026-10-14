-- BrokerOne property publishing workflow. DRAFT: review and approve before applying.
-- Requires database/public-listings.sql first. No existing record is made public.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_description text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_address text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_area_sqm numeric(9,2);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_bedrooms integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_bathrooms integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_floor integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_total_floors integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_parking boolean;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_elevator boolean;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_balcony boolean;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_mamad boolean;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_furnished boolean;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_available_from date;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_slug text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS publication_reviewed_by uuid;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS publication_reviewed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_public_slug ON public.properties(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_public_type ON public.properties(listing_type,published_at DESC) WHERE is_published = true;
CREATE TABLE IF NOT EXISTS public.property_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 office_id uuid NOT NULL REFERENCES public.offices(id),
 property_id uuid NOT NULL,
 url text NOT NULL CHECK(url ~ '^https://'),
 alt_text text,
 media_type text NOT NULL DEFAULT 'image' CHECK(media_type IN ('image','floorplan','video')),
 sort_order integer NOT NULL DEFAULT 0,
 is_public boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(office_id,property_id) REFERENCES public.properties(office_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_property_media_order ON public.property_media(office_id,property_id,sort_order);
-- Important: property_media requires office-scoped RLS policies and role grants
-- before any authenticated client access. Do not enable client writes by default.
