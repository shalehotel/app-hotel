-- Add metodo_pago column to caja_movimientos table
-- This allows tracking the payment/refund method used for each movement

ALTER TABLE public.caja_movimientos
ADD COLUMN metodo_pago text;

-- Add comment for documentation
COMMENT ON COLUMN public.caja_movimientos.metodo_pago IS 'Método de pago/devolución: EFECTIVO, YAPE, PLIN, TRANSFERENCIA, TARJETA, etc.';
