"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  User, 
  Mail, 
  ShieldAlert, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Loader2,
  Info,
  PhoneCall
} from "lucide-react";

// Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ServiceItem {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
  features: string[];
}

const SERVICES: ServiceItem[] = [
  { 
    id: "1", 
    name: "Seguro de Vehículo Personal", 
    price: "$120 / mes", 
    duration: "45 min",
    description: "Cobertura completa contra accidentes, daños a terceros y robos con asistencia vial 24/7.",
    features: ["Asistencia en grúa ilimitada", "Cobertura de daños a terceros", "Vehículo de reemplazo"]
  },
  { 
    id: "2", 
    name: "Asesoría de Seguro de Salud", 
    price: "$85 / sesión", 
    duration: "30 min",
    description: "Evaluación detallada de planes de salud familiares e individuales para optimizar tus coberturas.",
    features: ["Análisis de red médica", "Comparativa de deducibles", "Evaluación de dependientes"]
  },
  { 
    id: "3", 
    name: "Seguro de Propiedad y Hogar", 
    price: "$150 / mes", 
    duration: "60 min",
    description: "Protección total para tu vivienda, estructura y pertenencias ante catástrofes e incendios.",
    features: ["Protección contra incendios", "Robo de contenidos", "Responsabilidad civil en el hogar"]
  },
];

const TIME_SLOTS = [
  "09:00 AM", 
  "10:00 AM", 
  "11:00 AM",
  "02:00 PM", 
  "03:00 PM", 
  "04:00 PM", 
  "05:00 PM"
];

export default function BookingPage() {
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // PASO 1: Lógica de consulta a Supabase
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);

  // Formulario de Datos
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientNotes, setClientNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Consultar disponibilidad en tiempo real cuando se elige una fecha
  useEffect(() => {
    if (!selectedDate) {
      setOccupiedTimes([]);
      return;
    }

    const fetchOccupiedTimes = async () => {
      setLoadingAvailability(true);
      setSelectedTime("");
      setErrorMessage("");

      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("appointment_time")
          .eq("appointment_date", selectedDate)
          .neq("status", "Cancelada");

        if (error) {
          console.error("Error al consultar disponibilidad:", error);
        } else if (data) {
          const booked = data.map((item: { appointment_time: string }) => item.appointment_time);
          setOccupiedTimes(booked);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchOccupiedTimes();
  }, [selectedDate]);

  // Manejar el envío final
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientEmail) {
      setErrorMessage("Por favor completa todos los campos requeridos.");
      return;
    }

    setSubmitting(true);

    try {
      // Re-verificar ocupación antes de guardar
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", selectedDate)
        .eq("appointment_time", selectedTime)
        .neq("status", "Cancelada");

      if (existing && existing.length > 0) {
        throw new Error("El horario seleccionado ya fue reservado. Elige otro por favor.");
      }

      // Guardar en Supabase
      const { error: dbError } = await supabase.from("appointments").insert([
        {
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone || null,
          notes: clientNotes || null,
          service_name: selectedService.name,
          service_price: selectedService.price,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status: "Pendiente",
        },
      ]);

      if (dbError) throw dbError;

      // Intentar enviar email con Resend
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName,
            clientEmail,
            serviceName: selectedService.name,
            appointmentDate: selectedDate,
            appointmentTime: selectedTime,
            servicePrice: selectedService.price,
          }),
        });
      } catch (e) {
        console.warn("Fallo el envío del correo:", e);
      }

      setConfirmed(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar la cita.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Cita Confirmada!</h1>
          <p className="text-sm text-slate-600 mb-6">
            Te hemos enviado un correo de confirmación a <span className="font-semibold">{clientEmail}</span>.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* NAVBAR ORIGINAL */}
      <header className="w-full bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
              O
            </div>
            <span className="text-xl font-bold text-slate-900">Asegura</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60">
            <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            <span>Soporte: (809) 555-0100</span>
          </div>
        </div>
      </header>

      {/* CONTENIDO ORIGINAL */}
      <main className="flex-1 py-10 px-4 flex justify-center items-start">
        <div className="max-w-3xl w-full">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-medium mb-3 border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5" /> Reserva online en tiempo real
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Agenda tu Consulta de Seguros
            </h1>
            <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
              Elige el servicio de tu interés y selecciona el horario que mejor se adapte a tu agenda.
            </p>
          </div>

          {/* STEPPER ORIGINAL DE LA CAPTURA */}
          <div className="flex justify-between items-center mb-10 max-w-sm mx-auto relative px-2">
            {[
              { label: "Servicio", num: 1 },
              { label: "Fecha y Hora", num: 2 },
              { label: "Tus Datos", num: 3 },
            ].map((item) => (
              <div key={item.num} className="flex flex-col items-center z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step === item.num
                      ? "bg-indigo-600 text-white"
                      : step > item.num
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {item.num}
                </div>
                <span className={`text-xs mt-2 font-medium ${step === item.num ? "text-indigo-600 font-bold" : "text-slate-500"}`}>
                  {item.label}
                </span>
              </div>
            ))}
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 -z-0" />
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
            
            {/* PASO 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. Selecciona el servicio que necesitas</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Haz clic sobre una de las opciones para continuar con tu reserva.</p>
                </div>

                <div className="space-y-3">
                  {SERVICES.map((srv) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-slate-800 text-sm">{srv.name}</h3>
                          <span className="font-extrabold text-indigo-600 text-sm">{srv.price}</span>
                        </div>
                        <span className="inline-block text-[11px] text-slate-400 mb-2">Duración: {srv.duration}</span>
                        <p className="text-xs text-slate-500 mb-3">{srv.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {srv.features.map((feat, idx) => (
                            <span key={idx} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Check className="w-3 h-3 text-indigo-500" /> {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                  className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-sm"
                >
                  Siguiente Paso <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PASO 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">2. Elige fecha y hora de atención</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Selecciona el día para verificar horarios disponibles.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Fecha de consulta
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" /> Horarios disponibles
                    </label>

                    {loadingAvailability ? (
                      <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Consultando base de datos...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {TIME_SLOTS.map((time) => {
                          // PASO 2: Deshabilitar los botones de horario si existen en Supabase
                          const isBooked = occupiedTimes.includes(time);
                          const isSelected = selectedTime === time;

                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedTime(time)}
                              className={`p-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                                isBooked
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through opacity-60"
                                  : isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50 text-sm flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button
                    type="button"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                    className="w-2/3 bg-indigo-600 text-white font-medium py-3 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition text-sm flex items-center justify-center gap-1"
                  >
                    Siguiente Paso <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3 */}
            {step === 3 && (
              <form onSubmit={handleBooking} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">3. Completa tus datos de contacto</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Enviaremos el resumen y confirmación de la cita a tu correo electrónico.</p>
                </div>

                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs space-y-1">
                  <div className="flex justify-between font-medium text-slate-800">
                    <span>Servicio elegido:</span>
                    <span className="font-bold text-indigo-700">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fecha y Hora:</span>
                    <span className="font-semibold text-slate-800">{selectedDate} a las {selectedTime}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Correo electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono (Opcional)</label>
                    <input
                      type="tel"
                      placeholder="Ej. +1 (809) 555-0100"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notas adicionales (Opcional)</label>
                    <textarea
                      rows={2}
                      placeholder="Detalles sobre tu consulta..."
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setStep(2)}
                    className="w-1/3 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50 text-sm flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-2/3 bg-indigo-600 text-white font-medium py-3 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition text-sm flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Cita"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
