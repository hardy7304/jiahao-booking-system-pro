-- LINE message log for tracking push message usage and costs
CREATE TABLE IF NOT EXISTS public.line_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text,
  line_user_id text,
  message_type text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  sent_at timestamptz DEFAULT now(),
  success boolean DEFAULT true,
  cost_counted boolean DEFAULT true,
  error_message text
);

ALTER TABLE public.line_message_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_line_message_log_sent_at ON public.line_message_log (sent_at);
CREATE INDEX idx_line_message_log_type ON public.line_message_log (message_type);

-- LINE notification config defaults
INSERT INTO public.system_config (key, value) VALUES
  ('line_monthly_quota', '200'),
  ('line_notify_vip_only', 'true'),
  ('line_quota_alert_threshold', '180')
ON CONFLICT (key) DO NOTHING;
