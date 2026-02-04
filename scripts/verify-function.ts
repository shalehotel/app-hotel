import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyFunction() {
  console.log('🔍 Verificando conexión a Supabase...')
  console.log('📍 URL:', supabaseUrl)
  
  // Verificar si la función existe
  const { data, error } = await supabase.rpc('calcular_movimientos_turno', {
    p_turno_id: '00000000-0000-0000-0000-000000000000' // UUID dummy
  })
  
  if (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('❌ La función calcular_movimientos_turno NO EXISTE en esta base de datos')
      console.log('Error completo:', error.message)
    } else {
      console.log('⚠️ La función existe, pero hay otro error:', error.message)
    }
  } else {
    console.log('✅ La función calcular_movimientos_turno EXISTE y funciona')
    console.log('Resultado:', data)
  }
}

verifyFunction()
