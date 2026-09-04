"use client";

import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@supabase/supabase-js";

// Inicializar cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Service {
  id: string;
  name: string;
  duration: string;
  price: number | string;
}

const TIME_SLOTS = ["09:00 AM", "10:30 AM", "01:00 PM", "03:00 PM", "04:30 PM"];

export default function Home() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Cargar servicios dinámicamente desde Supabase
  useEffect(() => {
    async function fetchServices() {
      try {
        setLoadingServices(true);
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("price", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setServices(data);
          setSelectedService(data[0]);
        }
      } catch (err: any) {
        console.error("Error al cargar servicios desde Supabase:", err);
      } finally {
        setLoadingServices(false);
      }
    }

    fetchServices();
  }, []);

  // Formatear precio para evitar inconsistencias
  const formatPrice = (price: number | string | undefined) => {
    if (price === undefined || price === null) return "$0";
    if (typeof price === "number") return `$${price}`;
    return price.startsWith("$") ? price : `$${price}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Guardar cita en Supabase
      const { error } = await supabase.from("appointments").insert([
        {
          client_name: formData.name,
          client_email: formData.email,
          client_phone: formData.phone,
          service_name: selectedService.name,
          service_price: formatPrice(selectedService.price),
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status: "pending",
        },
      ]);

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err: any) {
      console.error("Error al guardar cita:", err);
      setErrorMessage("No se pudo guardar la cita. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 bg-grid-pattern text-slate-900 flex flex-col font-sans">
      {/* Header Minimalista */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistema en Línea
          </span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Reserva tu Cita en Segundos
          </h1>
          <p className="mt-2 text-slate-500 text-sm md:text-base">
            Selecciona el servicio de tu preferencia, elige el horario disponible y confirma tu solicitud sin complicaciones.
          </p>
        </div>

        {!isSubmitted ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 md:p-8 shadow-premium border border-slate-200/80">
              
              {/* Indicador de Pasos */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                {[
                  { num: 1, label: "Servicio" },
                  { num: 2, label: "Fecha y Hora" },
                  { num: 3, label: "Tus Datos" },
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step >= s.num
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {s.num}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${step >= s.num ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Paso 1: Servicio */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 mb-3">1. Selecciona un Servicio</h2>
                  
                  {loadingServices ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
                      ))}
                    </div>
                  ) : services.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No hay servicios disponibles en este momento.</p>
                  ) : (
                    <div className="space-y-3">
                      {services.map((srv) => (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => setSelectedService(srv)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                            selectedService?.id === srv.id
                              ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{srv.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Duración aprox: {srv.duration}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{formatPrice(srv.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    disabled={!selectedService}
                    onClick={() => setStep(2)}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all text-sm shadow-md shadow-indigo-500/10"
                  >
                    Continuar a Fecha y Hora &rarr;
                  </button>
                </div>
              )}

              {/* Paso 2: Fecha y Hora */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-slate-900">2. Elige Fecha y Horario</h2>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Fecha</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Horarios Disponibles</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedTime === slot
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl text-sm transition-all"
                    >
                      &larr; Volver
                    </button>
                    <button
                      type="button"
                      disabled={!selectedDate || !selectedTime}
                      onClick={() => setStep(3)}
                      className="w-2/3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all text-sm shadow-md shadow-indigo-500/10"
                    >
                      Continuar a tus Datos &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Paso 3: Contacto y Confirmación */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 mb-2">3. Ingresa tus Datos</h2>

                  {errorMessage && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                      {errorMessage}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (809) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-1/3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl text-sm transition-all"
                    >
                      &larr; Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-2/3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
                    >
                      {isLoading ? "Guardando..." : "Confirmar Cita"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Tarjeta de Resumen Flotante */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

              <h3 className="text-base font-bold text-slate-100 mb-6 pb-3 border-b border-slate-800 flex items-center justify-between">
                <span>Resumen de Reserva</span>
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800/50">
                  Asegura
                </span>
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Servicio Seleccionado</span>
                  <p className="font-semibold text-slate-100">{selectedService?.name || "Selecciona un servicio"}</p>
                  <p className="text-xs text-indigo-300 mt-0.5">{selectedService?.duration || "-"}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400 block mb-1">Fecha y Horario</span>
                  <p className="font-medium text-slate-200">
                    {selectedDate ? selectedDate : "Por seleccionar..."}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedTime ? selectedTime : "Horario pendiente"}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Costo Total</span>
                  <span className="text-2xl font-black text-white">{formatPrice(selectedService?.price)}</span>
                </div>
              </div>

              <div className="mt-8 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reserva garantizada. Recibirás un recordatorio por correo electrónico y WhatsApp una vez confirmada.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-2xl p-8 shadow-premium border border-slate-200/80 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">¡Cita Guardada Exitosamente!</h2>
            <p className="text-slate-500 text-sm mt-2">
              Los datos se han registrado correctamente en el sistema.
            </p>
            <div className="mt-6 p-4 rounded-xl bg-slate-50 text-left text-xs space-y-2 border border-slate-200/60">
              <p><span className="text-slate-400">Cliente:</span> <strong className="text-slate-700">{formData.name}</strong></p>
              <p><span className="text-slate-400">Fecha:</span> <strong className="text-slate-700">{selectedDate} ({selectedTime})</strong></p>
              <p><span className="text-slate-400">Contacto:</span> <strong className="text-slate-700">{formData.email}</strong></p>
            </div>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setStep(1);
              }}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl text-sm transition-all"
            >
              Realizar Otra Reserva
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
