-- Track per-user lunch feedback so we know when lunch has passed
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS feedback TEXT
  CHECK (feedback IN ('liked', 'disliked') OR feedback IS NULL);

COMMENT ON COLUMN public.daily_attendance.feedback IS
  'Stores whether the user liked or disliked the lunch for a given day';

