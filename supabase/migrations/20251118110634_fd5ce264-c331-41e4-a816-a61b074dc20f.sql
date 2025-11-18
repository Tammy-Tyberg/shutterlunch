-- Add unique constraint to daily_attendance for user_id and date combination
ALTER TABLE public.daily_attendance 
ADD CONSTRAINT daily_attendance_user_date_unique UNIQUE (user_id, date);