-- Add notes column to bookings table for therapist-specific notes from customers
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
