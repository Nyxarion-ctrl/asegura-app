'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

interface BusinessSettings {
  business_name: string;
  whatsapp_number: string;
  opening_time: string;
  closing_time: string;
  slot_duration_minutes: number;
  primary_color: string;
  buffer_minutes?: number;
  currency?: string;
  working_days?: string[];
}

export default function BookingPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Cargar configuración e información de servicios
    const { data: settingsData } = await supabase.from('business_settings').select('*').single();
    const { data: servicesData } = await supabase.from('services').select('*');

    if (settingsData) setSettings(settingsData);
    if (servicesData) setServices(servicesData);
    setLoading(false);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) return;

    // Guardar la cita en Supabase
    const { error } = await supabase.from('bookings').insert([
      {
        service_id: selectedService.id,
        service_name: selectedService.name,
        client_name: clientName,
        client_phone: clientPhone,
        booking_date: selectedDate,
        booking_time: selectedTime,
        price: selectedService.price,
        status: 'pending',
      },
    ]);

    if (!error) {
      setBookingSuccess(true);
      // Redirigir a WhatsApp con el mensaje prellenado para el dueño del negocio
      if (settings?.whatsapp_number) {
        const message = encodeURIComponent(
          `¡Hola! Quisiera confirmar mi cita:\n\n📌 *Servicio:* ${selectedService.name}\n📅 *Fecha:* ${selectedDate}\n⏰ *Hora:* ${selectedTime}\n👤 *Cliente:* ${clientName}`
        );
        window.open(`https://wa.me/${settings.whatsapp_number}?text=${message}`, '_blank');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm font-semibold text-slate-500">Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-6">
        {/* Encabezado del Negocio */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {settings?.business_name || 'Reservar Cita'}
          </h1>
          <p className="text-xs text-slate-500">Selecciona tu servicio y horario de atención</p>
        </div>

        {bookingSuccess ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h2 className="text-lg font-bold text-slate-800">¡Reserva Registrada!</h2>
            <p className="text-xs text-slate-500">
              Se ha abierto WhatsApp para notificar directamente al negocio sobre tu cita.
            </p>
          </div>
        ) : (
          <form onSubmit={handleBooking} className="space-y-5">
            {/* 1. Seleccionar Servicio */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">1. Selecciona el Servicio</label>
              <div className="space-y-2">
                {services.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex justify-between items-center ${
                      selectedService?.id === s.id
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.duration_minutes} min</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">
                      {settings?.currency || '$'} {s.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Seleccionar Fecha */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">2. Fecha</label>
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>

            {/* 3. Seleccionar Hora */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">3. Hora disponible</label>
              <input
                type="text"
                placeholder="Ej. 10:00 AM"
                required
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>

            {/* 4. Datos del Cliente */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800">4. Tus Datos</label>
              <input
                type="text"
                placeholder="Nombre Completo"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500"
              />
              <input
                type="tel"
                placeholder="Teléfono / WhatsApp"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedService}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              Confirmar y Agendar Cita
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
