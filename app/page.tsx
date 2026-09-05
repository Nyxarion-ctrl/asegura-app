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
  Shield,
  PhoneCall
} from "lucide-react";

// Inicializar cliente de Supabase
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
  
  // Disponibilidad en tiempo real desde Supabase
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);

  // Formulario del cliente
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [clientNotes, setClientNotes] = useState<string>("");

  // Estados de control de UI
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Consultar disponibilidad en Supabase al cambiar la fecha seleccionada
  useEffect(() => {
    if (!selectedDate) {
      setOccupiedTimes([]);
      return;
    }

    const fetchOccupiedTimes = async () => {
      setLoadingAvailability(true);
      setSelectedTime(""); // Resetear hora previamente seleccionada
      setErrorMessage("");

      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("appointment_time")
          .eq("appointment_date", selectedDate)
          .neq("status", "Cancelada"); // Ignorar citas canceladas

        if (error) {
          console.error("Error al consultar disponibilidad:", error);
          setErrorMessage("No se pudo cargar la disponibilidad en tiempo real. Intenta de nuevo.");
        } else if (data) {
          const booked = data.map((item: { appointment_time: string }) => item.appointment_time);
          setOccupiedTimes(booked);
        }
      } catch (err) {
        console.error("Excepción consultando disponibilidad:", err);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchOccupiedTimes();
  }, [selectedDate]);

  // Manejador del envío del formulario
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedService || !selectedDate || !selectedTime) {
      setErrorMessage("Por favor completa la selección de servicio, fecha y hora.");
      return;
    }

    if (!clientName.trim() || !clientEmail.trim()) {
      setErrorMessage("Por favor proporciona tu nombre y correo electrónico.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Verificar nuevamente disponibilidad previa a la inserción
      const { data: existing, error: checkError } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", selectedDate)
        .eq("appointment_time", selectedTime)
        .neq("status", "Cancelada");

      if (checkError) {
        throw new Error("Ocurrió un error verificando la disponibilidad del turno.");
      }

      if (existing && existing.length > 0) {
        throw new Error("El horario seleccionado acaba de ser ocupado. Por favor elige otro turno.");
      }

      // 2. Guardar la cita en la tabla `appointments` de Supabase
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

      if (dbError) {
        console.error("Error Supabase:", dbError);
        throw new Error("Error al guardar la cita en la base de datos.");
      }

      // 3. Enviar correo de confirmación mediante Resend API Route
      try {
        const response = await fetch("/api/send-email", {
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

        if (!response.ok) {
          console.warn("La cita fue registrada pero hubo un inconveniente notificando por email.");
        }
      } catch (emailErr) {
        console.error("Error al conectar con la API de correos:", emailErr);
      }

      setConfirmed(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Ocurrió un problema procesando tu reserva. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla de Confirmación
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-slate-50 to-slate-100 flex flex-col">
        {/* Header / Logo Bar */}
        <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">Asegura</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 md:p-10 text-center border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">¡Cita Registrada!</h1>
            <p className="text-slate-600 mb-8 text-sm md:text-base">
              Hemos reservado tu turno correctamente. Hemos enviado un correo con todos los detalles a{" "}
              <span className="font-semibold text-slate-800">{clientEmail}</span>.
            </p>

            <div className="bg-slate-50 p-6 rounded-2xl text-left mb-8 space-y-3 text-sm border border-slate-200/80">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Servicio:</span>
                <span className="font-semibold text-slate-800 text-right">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Fecha:</span>
                <span className="font-semibold text-slate-800">{selectedDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Hora:</span>
                <span className="font-semibold text-slate-800">{selectedTime}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold text-slate-800">{clientName}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Monto del Servicio:</span>
                <span className="font-bold text-indigo-600">{selectedService?.price}</span>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              Agendar otra cita
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-slate-50 to-slate-100 flex flex-col">
      
      {/* NAVBAR SUPERIOR CON LOGO Y NOMBRE */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Asegura</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
            <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
            <span>Soporte: (809) 555-0100</span>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 py-10 px-4 flex justify-center items-start">
        <div className="max-w-3xl w-full">
          
          {/* Encabezado Principal */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-indigo-100/80 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Reserva online en tiempo real
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Agenda tu Consulta de Seguros
            </h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base max-w-md mx-auto">
              Elige el servicio de tu interés y selecciona el horario que mejor se adapte a tu agenda.
            </p>
          </div>

          {/* Indicador de Pasos / Stepper */}
          <div className="flex justify-between items-center mb-10 max-w-md mx-auto relative px-4">
            {[
              { label: "Servicio", num: 1 },
              { label: "Fecha y Hora", num: 2 },
              { label: "Tus Datos", num: 3 },
            ].map((item) => (
              <div key={item.num} className="flex flex-col items-center z-10">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    step === item.num
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-4 ring-indigo-100"
                      : step > item.num
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-slate-400 border border-slate-200"
                  }`}
                >
                  {step > item.num ? <Check className="w-5 h-5" /> : item.num}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    step === item.num ? "text-indigo-600 font-bold" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}

            {/* Línea conectora entre pasos */}
            <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-200 -z-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
              />
            </div>
          </div>

          {/* Mensaje de Alerta / Error */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600" />
              <p className="flex-1">{errorMessage}</p>
            </div>
          )}

          {/* Tarjeta de Contenido del Formulario */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 md:p-10 transition-all">
            
            {/* PASO 1: Selección de Servicio */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">1. Selecciona el servicio que necesitas</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Haz clic sobre una de las opciones para continuar con tu reserva.
                  </p>
                </div>

                <div className="space-y-4">
                  {SERVICES.map((srv) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                            : "border-slate-200/80 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-slate-800 text-base">{srv.name}</h3>
                            <span className="inline-block text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full mt-1">
                              Duración: {srv.duration}
                            </span>
                          </div>
                          <span className="font-extrabold text-indigo-600 text-lg">{srv.price}</span>
                        </div>

                        <p className="text-sm text-slate-600 mb-3">{srv.description}</p>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                          {srv.features.map((feat, idx) => (
                            <span key={idx} className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-500" /> {feat}
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
                  className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                >
                  Siguiente Paso <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* PASO 2: Selección de Fecha y Hora */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">2. Elige fecha y hora de atención</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Los horarios ocupados se deshabilitan automáticamente en tiempo real.
                  </p>
                </div>

                {/* Selector de Fecha */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" /> Selecciona la fecha
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium bg-slate-50/50"
                  />
                </div>

                {/* Selector de Hora */}
                {selectedDate && (
                  <div className="pt-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" /> Horarios disponibles para {selectedDate}
                    </label>

                    {loadingAvailability ? (
                      <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Consultando agenda en tiempo real...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {TIME_SLOTS.map((time) => {
                          const isBooked = occupiedTimes.includes(time);
                          const isSelected = selectedTime === time;

                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedTime(time)}
                              className={`p-3.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                isBooked
                                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                                  : isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                              }`}
                            >
                              <Clock className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!loadingAvailability && occupiedTimes.length > 0 && (
                      <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-400" /> Los horarios tachados ya han sido reservados por otros clientes.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button
                    type="button"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                    className="w-2/3 bg-indigo-600 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    Siguiente Paso <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: Formulario del Cliente y Confirmación */}
            {step === 3 && (
              <form onSubmit={handleBooking} className="space-y-6 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">3. Completa tus datos de contacto</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Enviaremos el resumen y confirmación de la cita a tu correo electrónico.
                  </p>
                </div>

                {/* Resumen de Selección */}
                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-sm space-y-2">
                  <div className="flex justify-between font-medium text-slate-800">
                    <span>Servicio elegido:</span>
                    <span className="font-bold text-indigo-700">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fecha y Hora:</span>
                    <span className="font-semibold text-slate-800">{selectedDate} a las {selectedTime}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" /> Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-indigo-600" /> Correo electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Teléfono (Opcional)
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. +1 (809) 555-0199"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Notas adicionales (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Comentarios sobre el caso o detalles de interés..."
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm resize-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setStep(2)}
                    className="w-1/3 border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-2/3 bg-indigo-600 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Procesando...
                      </>
                    ) : (
                      "Confirmar Cita"
                    )}
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
