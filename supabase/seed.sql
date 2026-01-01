-- Este archivo se ejecuta automáticamente después de cada `supabase db reset`
-- Úsalo para crear datos de prueba en tu BD local

-- Ejemplo: Insertar datos de prueba
-- IMPORTANTE: Esto solo se ejecuta en LOCAL, no en producción

-- Ejemplo comentado (descomenta y modifica según tu esquema):
/*
-- Insertar usuarios de prueba
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@test.com', 'Admin User', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'staff@test.com', 'Staff User', 'staff'),
  ('33333333-3333-3333-3333-333333333333', 'guest@test.com', 'Guest User', 'guest');

-- Insertar habitaciones de prueba
INSERT INTO public.rooms (room_number, room_type, floor, capacity, price_per_night, status) VALUES
  ('101', 'Standard', 1, 2, 100.00, 'available'),
  ('102', 'Standard', 1, 2, 100.00, 'available'),
  ('201', 'Deluxe', 2, 2, 150.00, 'available'),
  ('301', 'Suite', 3, 4, 300.00, 'available');
*/

-- Por ahora, solo un comentario de ejemplo
SELECT 'Seed file ready. Add your test data here.' AS message;
