-- Add has_rated column to daily_attendance to track if user has rated today's restaurant
ALTER TABLE public.daily_attendance 
ADD COLUMN has_rated boolean DEFAULT false;