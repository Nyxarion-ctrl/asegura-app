'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Guardar o actualizar un servicio con su tarifa oficial
export async function createService(formData: FormData) {
  const supabase = await createClient()

  const business_id = formData.get('business_id') as string
  const name = formData.get('name') as string
  const duration_minutes = parseInt(formData.get('duration_minutes') as string)
  const price = parseFloat(formData.get('price') as string)

  // Convertir a centavos (ej: 1500.00 -> 150000)
  const price_cents = Math.round(price * 100)

  const { error } = await supabase.from('services').insert({
    business_id,
    name,
    duration_minutes,
    price_cents,
    is_active: true
  })

  if (error) {
    throw new Error(`Error al guardar el servicio: ${error.message}`)
  }

  revalidatePath('/admin')
}

// Obtener los servicios cargados
export async function getServices(businessId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
