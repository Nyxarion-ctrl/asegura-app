import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { clienteNombre, clienteTelefono, fecha, hora } = await request.json();

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                cliente_nombre: clienteNombre,
                cliente_telefono: clienteTelefono,
                fecha: fecha,
                hora: hora,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: process.env.LEMONSQUEEZY_STORE_ID,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: process.env.LEMONSQUEEZY_VARIANT_ID,
              },
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (data.data?.attributes?.url) {
      return NextResponse.json({ url: data.data.attributes.url });
    } else {
      return NextResponse.json({ error: 'No se pudo generar la pasarela de pago' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}