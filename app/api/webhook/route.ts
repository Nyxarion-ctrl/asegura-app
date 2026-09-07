import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const text = await request.text();
    const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!);
    const digest = Buffer.from(hmac.update(text).digest('hex'), 'utf8');
    const signature = Buffer.from(request.headers.get('x-signature') || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signature)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
    }

    const payload = JSON.parse(text);
    const eventName = payload.meta.event_name;

    if (eventName === 'order_created') {
      const customData = payload.meta.custom_data;
      const orderTotal = payload.data.attributes.total / 100;

      if (customData) {
        await supabase.from('reservas').insert([
          {
            cliente_nombre: customData.cliente_nombre,
            cliente_telefono: customData.cliente_telefono,
            fecha: customData.fecha,
            hora: customData.hora,
            monto_anticipo: orderTotal,
            estado_pago: 'completado',
            notas: `Lemon Squeezy Orden #${payload.data.id}`,
          },
        ]);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}