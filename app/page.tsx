"use client";

import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@supabase/supabase-js";

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
const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const todayDateStr = new Date().toISOString().split("T")[0];
  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([]);
      return;
    }

    let isMounted = true;
    async function fetchBookedSlots() {
      try {
        setLoadingSlots(true);
        const { data, error } = await supabase
          .from("appointments")
          .select("appointment_time")
          .eq("appointment_date", selectedDate)
          .neq("status", "cancelled");

        if (error) throw error;

        if (isMounted && data) {
          const slots = data.map((item: { appointment_time: string }) => item.appointment_time);
          setBookedSlots(slots);
        }
      } catch (err) {
        console.error("Error al obtener horarios ocupados:", err);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    fetchBookedSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    let isMounted = true;
    async function fetchServices() {
      try {
        setLoadingServices(true);
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("price", { ascending: true });

        if (error) throw error;

        if (isMounted && data && data.length > 0) {
          setServices(data);
          setSelectedService(data[0]);
        }
      } catch (err) {
        console.error("Error al cargar servicios:", err);
      } finally {
        if (isMounted) setLoadingServices(false);
      }
    }
    fetchServices();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatPrice = (price: number | string | undefined) => {
    if (price === undefined || price === null) return "$0";
    if (typeof price === "number") return `$${price}`;
    return price.startsWith("$") ? price : `$${price}`;
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setStep(1);
    setSelectedDate("");
    setSelectedTime("");
    setFormData({ name: "", email: "", phone: "" });
    setErrorMessage("");
    if (services.length > 0) setSelectedService(services[0]);
  };

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Verificar si el horario sigue libre justo antes de guardar
      const { data: existing, error: checkError } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", selectedDate)
        .eq("appointment_time", selectedTime)
        .neq("status", "cancelled");

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        setErrorMessage("El horario seleccionado acaba de ser reservado por otro cliente. Por favor, elige otro.");
        setStep(2);
        setIsLoading(false);
        return;
      }

      // Guardar la cita si está disponible
      const { error } = await supabase.from("appointments").insert([
        {
          client_name: formData.name.trim(),
          client_email: formData.email.trim(),
          client_phone: formData.phone.trim(),
          service_name: selectedService.name,
          duration: selectedService.duration || "30 min",
          price: formatPrice(selectedService.price),
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
      setErrorMessage(
        err?.message || "No se pudo guardar la cita. Inténtalo de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 bg-grid-pattern text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Minimalista */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistema en Línea
          </span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            Reserva tu Cita en Segundos
          </h1>
          <p className="mt-2 text-slate-500 text-sm md:text-base leading-relaxed">
            Selecciona el servicio de tu preferencia, elige el horario disponible y confirma tu solicitud sin complicaciones.
          </p>
        </div>

        {!isSubmitted ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-200/80 transition-all">
              
              {/* Stepper / Indicador de Pasos con Línea de Conexión */}
              <div className="relative flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-100 -z-0"></div>
                <div
                  className="absolute top-4 left-6 h-0.5 bg-indigo-600 transition-all duration-300 -z-0"
                  style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
                ></div>

                {[
                  { num: 1, label: "Servicio" },
                  { num: 2, label: "Fecha y Hora" },
                  { num: 3, label: "Tus Datos" },
                ].map((s) => (
                  <div key={s.num} className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        step === s.num
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md shadow-indigo-500/20 scale-105"
                          : step > s.num
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {step > s.num ? "✓" : s.num}
                    </div>
                    <span className={`text-xs font-medium ${step >= s.num ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Paso 1: Servicio */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">1. Selecciona un Servicio</h2>
                  
                  {loadingServices ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-slate-100/80 rounded-2xl animate-pulse"></div>
                      ))}
                    </div>
                  ) : services.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No hay servicios disponibles en este momento.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {services.map((srv) => {
                        const isSelected = selectedService?.id === srv.id;
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => setSelectedService(srv)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group cursor-pointer ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                                : "border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 group-hover:border-slate-400"
                              }`}>
                                {isSelected && <span className="text-[10px]">✓</span>}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{srv.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Duración aprox: {srv.duration}</p>
                              </div>
                            </div>
                            <span className="text-base font-extrabold text-slate-900">{formatPrice(srv.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    disabled={!selectedService}
                    onClick={() => setStep(2)}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Fecha de la Cita</label>
                    <input
                      type="date"
                      min={todayDateStr}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-slate-50/30"
                    />
                  </div>

                 <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Horarios Disponibles {loadingSlots && <span className="text-slate-400 font-normal">(Cargando disponibilidad...)</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedTime === slot;
              const isBooked = bookedSlots.includes(slot);

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isBooked || loadingSlots}
                  onClick={() => setSelectedTime(slot)}
                  className={`p-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isBooked
                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                      : isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-[1.02] cursor-pointer"
                      : "border-slate-100 hover:border-slate-300 text-slate-700 bg-white cursor-pointer"
                  }`}
                >
                  <span>{slot}</span>
                  {isBooked && (
                    <span className="text-[10px] font-normal text-red-500">Ocupado</span>
                  )}
                </button>
              );
         })}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-3.5 rounded-xl text-sm transition-all cursor-pointer"
                    >
                      &larr; Volver
                    </button>
                    <button
                      type="button"
                      disabled={!selectedDate || !selectedTime}
                      onClick={() => setStep(3)}
                      className="w-2/3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
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
                    <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200/80 font-medium">
                      {errorMessage}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400 bg-slate-50/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400 bg-slate-50/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (809) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400 bg-slate-50/30"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-1/3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-3.5 rounded-xl text-sm transition-all cursor-pointer"
                    >
                      &larr; Volver
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-2/3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                          <span>Guardando Cita...</span>
                        </>
                      ) : (
                        "Confirmar Cita"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Tarjeta de Resumen Flotante Dinámica */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <h3 className="text-base font-bold text-slate-100 mb-6 pb-4 border-b border-slate-800 flex items-center justify-between">
                <span>Resumen de Reserva</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-950/90 px-2.5 py-1 rounded-md border border-indigo-800/60">
                  ASEGURA
                </span>
              </h3>

              <div className="space-y-5 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Servicio Seleccionado</span>
                  <p className="font-bold text-slate-100 text-base">{selectedService?.name || "Selecciona un servicio"}</p>
                  <p className="text-xs text-indigo-400 font-medium mt-0.5">{selectedService?.duration || "-"}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400 block mb-1">Fecha y Horario</span>
                  <p className={`font-semibold ${selectedDate ? "text-slate-100" : "text-slate-500 italic"}`}>
                    {selectedDate ? selectedDate : "Por seleccionar..."}
                  </p>
                  <p className={`text-xs mt-0.5 ${selectedTime ? "text-slate-300 font-medium" : "text-slate-500 italic"}`}>
                    {selectedTime ? selectedTime : "Horario pendiente"}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Costo Total</span>
                  <span className="text-3xl font-black text-white">{formatPrice(selectedService?.price)}</span>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-start gap-3 backdrop-blur-sm">
                <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  Reserva garantizada. Recibirás un recordatorio por correo electrónico y WhatsApp una vez confirmada.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-2xl border border-slate-200/80 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900">¡Cita Guardada Exitosamente!</h2>
            <p className="text-slate-500 text-sm mt-2">
              Los datos se han registrado correctamente en el sistema.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 text-left text-xs space-y-2.5 border border-slate-200/80">
              <p className="flex justify-between"><span className="text-slate-400">Cliente:</span> <strong className="text-slate-800 font-semibold">{formData.name}</strong></p>
              <p className="flex justify-between"><span className="text-slate-400">Fecha y Hora:</span> <strong className="text-slate-800 font-semibold">{selectedDate} ({selectedTime})</strong></p>
              <p className="flex justify-between"><span className="text-slate-400">Contacto:</span> <strong className="text-slate-800 font-semibold">{formData.email}</strong></p>
            </div>
            <button
              onClick={handleReset}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md cursor-pointer active:scale-[0.99]"
            >
              Realizar Otra Reserva
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
