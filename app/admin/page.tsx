'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Reserva {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha: string;
  hora: string;
  monto_anticipo: number;
  estado_pago: string;
  created_at: string;
}

export default function AdminPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservas() {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReservas(data);
      }
      setLoading(false);
    }

    fetchReservas();
  }, []);

  const enviarWhatsApp = (telefono: string, nombre: string, fecha: string, hora: string) => {
    const mensaje = encodeURIComponent(
      `Hola ${nombre}, ¡saludos desde Asegura! 👋 Te recordamos tu cita confirmada para el día ${fecha} a las ${hora}. ¡Te esperamos!`
    );
    const numeroLimpio = telefono.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${numeroLimpio}?text=${mensaje}`, '_blank');
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Control · Asegura</h1>
            <p className="text-sm text-slate-500">Gestión de citas y anticipos confirmados</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 font-semibold text-xs rounded-full">
            En línea
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando reservas...</div>
        ) : reservas.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
            Aún no hay reservas registradas.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Teléfono</th>
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4">Anticipo</th>
                  <th className="px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.cliente_nombre}</td>
                    <td className="px-6 py-4">{item.cliente_telefono}</td>
                    <td className="px-6 py-4">{item.fecha} - {item.hora}</td>
                    <td className="px-6 py-4 font-bold text-green-600">${item.monto_anticipo} USD</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => enviarWhatsApp(item.cliente_telefono, item.cliente_nombre, item.fecha, item.hora)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all flex items-center gap-1"
                      >
                        Recordar por WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}