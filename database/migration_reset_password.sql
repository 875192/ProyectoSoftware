-- Migration: add password reset token fields to usuarios table
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;
