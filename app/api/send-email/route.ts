import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { clientName, clientEmail, serviceName, appointmentDate, appointmentTime, servicePrice } = await req.json();

    if (!clientEmail || !clientName) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: "Asegura <onboarding@resend.dev>",
      to: [clientEmail],
      subject: "Confirmación de tu Reserva - Asegura",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; text-align: center;">¡Cita Confirmada!</h2>
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Tu reserva para el servicio <strong>${serviceName}</strong> se ha completado con éxito.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${appointmentDate}</p>
            <p style="margin: 5px 0;"><strong>Horario:</strong> ${appointmentTime}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> ${servicePrice}</p>
          </div>

          <p style="color: #64748b; font-size: 13px;">Si necesitas reprogramar o cancelar, por favor contáctanos con anticipación.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="text-align: center; font-size: 12px; color: #94a3b8;">© Asegura - Todos los derechos reservados</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error enviando email con Resend:", error);
    return NextResponse.json({ error: error.message || "Error al enviar correo" }, { status: 500 });
  }
}
