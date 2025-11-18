-- Create function to update timestamps (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to store the daily restaurant selection (shared by all users)
CREATE TABLE public.daily_restaurant_selection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS
ALTER TABLE public.daily_restaurant_selection ENABLE ROW LEVEL SECURITY;

-- Anyone can view the daily selection
CREATE POLICY "Anyone can view daily selection" 
ON public.daily_restaurant_selection 
FOR SELECT 
USING (true);

-- Only authenticated users can update/insert
CREATE POLICY "Authenticated users can manage daily selection" 
ON public.daily_restaurant_selection 
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index on date for faster lookups
CREATE INDEX idx_daily_restaurant_selection_date ON public.daily_restaurant_selection(date);

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_daily_restaurant_selection_updated_at
BEFORE UPDATE ON public.daily_restaurant_selection
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();