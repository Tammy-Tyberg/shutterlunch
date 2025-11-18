-- Create dietary restrictions enum
CREATE TYPE public.dietary_restriction AS ENUM (
  'halal',
  'kosher',
  'vegan',
  'vegetarian',
  'gluten_free'
);

-- Add new columns to user_preferences (nullable first)
ALTER TABLE public.user_preferences 
  ADD COLUMN preference_type TEXT,
  ADD COLUMN preference_value TEXT;

-- Migrate existing data - map old dietary prefs to 'dietary' type, cuisine to 'cuisine' type
UPDATE public.user_preferences
SET 
  preference_type = CASE 
    WHEN preference IN ('halal', 'kosher', 'vegan', 'vegetarian') THEN 'dietary'
    ELSE 'cuisine'
  END,
  preference_value = preference::TEXT;

-- Now make columns NOT NULL
ALTER TABLE public.user_preferences 
  ALTER COLUMN preference_type SET NOT NULL,
  ALTER COLUMN preference_value SET NOT NULL,
  ADD CONSTRAINT check_preference_type CHECK (preference_type IN ('cuisine', 'dietary'));

-- Drop old column
ALTER TABLE public.user_preferences DROP COLUMN preference;

-- Update restaurants table to support multiple cuisines and dietary restrictions
ALTER TABLE public.restaurants 
  ADD COLUMN cuisine_types TEXT[] DEFAULT '{}',
  ADD COLUMN dietary_restrictions public.dietary_restriction[] DEFAULT '{}';

-- Migrate existing restaurant cuisine_type data to cuisine_types array
UPDATE public.restaurants
SET cuisine_types = ARRAY[cuisine_type::TEXT]
WHERE cuisine_type IS NOT NULL;

-- Now drop the old column
ALTER TABLE public.restaurants DROP COLUMN cuisine_type;

-- Make cuisine_types required
ALTER TABLE public.restaurants 
  ALTER COLUMN cuisine_types SET NOT NULL;

-- Add indexes for better query performance
CREATE INDEX idx_restaurants_cuisine_types ON public.restaurants USING GIN(cuisine_types);
CREATE INDEX idx_restaurants_dietary_restrictions ON public.restaurants USING GIN(dietary_restrictions);