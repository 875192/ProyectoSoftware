-- Migración: añadir referencia de pago Stripe a solicitudes
ALTER TABLE solicitudes
ADD COLUMN stripe_payment_intent_id VARCHAR(255);
