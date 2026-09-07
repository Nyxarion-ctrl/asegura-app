"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_name: string;
  service_price: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

interface BlockedSlot {
  id: string;
  blocked_date: string;
  blocked_time: string;
  reason: string;
  created_at: string;
}

interface BusinessSettings {
  id: string;
  business_name: string;
  whatsapp_number: string;
  primary_color: string;
  opening_time: string;
  closing_time: string;
  slot_duration_minutes: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<"APPOINTMENTS" | "BLOCKS" | "SETTINGS">("APPOINTMENTS");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELLED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Formulario para nuevo bloqueo
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockTime, setNewBlockTime] = useState("ALL");
  const [newBlockReason, setNewBlockReason] = useState("");

  // Configuración del negocio
  const [settings, setSettings] = useState<BusinessSettings>({
    id: "11111111-1111-1111-1111-111111111111",
    business_name: "Asegura Demo",
    whatsapp_number: "8090000000",
    primary_color: "#3B82F6",
    opening_time: "08:00",
    closing_time: "18:00",
    slot_duration_minutes: 60,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem("admin_authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
      fetchData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN.trim()) {
      setIsAuthenticated(true);
      setPinError(false);
      localStorage.setItem("admin_authenticated", "true");
      fetchData();
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    setPinInput("");
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAppointments(), fetchBlockedSlots(), fetchSettings()]);
    setLoading(false);
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAppointments(data as Appointment[]);
    }
  };

  const fetchBlockedSlots = async () => {
    const { data, error } = await supabase
      .from("blocked_slots")
      .select("*")
      .order("blocked_date", { ascending: true });

    if (!error && data) {
      setBlockedSlots(data as BlockedSlot[]);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .eq("id", "11111111-1111-1111-1111-111111111111")
      .single();

    if (!error && data) {
      setSettings(data as BusinessSettings);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    const { error } = await supabase.from("business_settings").upsert({
      id: settings.id,
      business_name: settings.business_name,
      whatsapp_number: settings.whatsapp_number,
      primary_color: settings.primary_color,
      opening_time: settings.opening_time,
      closing_time: settings.closing_time,
      slot_duration_minutes: Number(settings.slot_duration_minutes),
      updated_at: new Date().toISOString(),
    });

    setSavingSettings(false);

    if (error) {
      alert("Error al guardar la configuración: " + error.message);
    } else {
      alert("Configuración actualizada con éxito.");
    }
  };

  const updateStatus = async (id: string, newStatus: "CONFIRMED" | "CANCELLED") => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    } else {
      alert("Error al actualizar el estado: " + error.message);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta cita permanentemente?")) return;

    const { error } = await supabase.from("appointments").delete().eq("id", id);

    if (!error) {
      setAppointments((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const clearCancelledAppointments = async () => {
    if (!confirm("¿Deseas eliminar permanentemente TODAS las citas canceladas?")) return;

    const { error } = await supabase.from("appointments").delete().ilike("status", "cancelled");

    if (!error) {
      setAppointments((prev) =>
        prev.filter((item) => (item.status || "").toLowerCase() !== "cancelled")
      );
    }
  };

  const sendWhatsAppNotification = (item: Appointment) => {
    let cleanPhone = item.client_phone ? item.client_phone.replace(/\D/g, "") : "";

    if (cleanPhone.length === 10) {
      cleanPhone = `1${cleanPhone}`;
    }

    if (!cleanPhone) {
      alert("El cliente no tiene un número válido.");
      return;
    }

    const message = `¡Hola, *${item.client_name}*! 👋\n\nTe escribimos de *${settings.business_name || "Asegura"}* para confirmar tu reserva:\n\n📌 *Servicio:* ${item.service_name}\n📅 *Fecha:* ${item.appointment_date}\n⏰ *Hora:* ${item.appointment_time}\n💰 *Precio:* ${item.service_price}\n\n¡Te esperamos!`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockDate) {
      alert("Por favor selecciona una fecha.");
      return;
    }

    const { data, error } = await supabase
      .from("blocked_slots")
      .insert([
        {
          blocked_date: newBlockDate,
          blocked_time: newBlockTime,
          reason: newBlockReason || "No disponible",
        },
      ])
      .select();

    if (error) {
      alert("Error al guardar bloqueo: " + error.message);
    } else if (data) {
      setBlockedSlots((prev) => [...prev, ...data]);
      setNewBlockDate("");
      setNewBlockReason("");
      alert("Bloqueo registrado correctamente.");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("¿Deseas desbloquear este horario/fecha?")) return;

    const { error } = await supabase.from("blocked_slots").delete().eq("id", id);

    if (!error) {
      setBlockedSlots((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const filteredAppointments = appointments.filter((item) => {
    const status = (item.status || "pending").toLowerCase();

    let matchesStatus = true;
    if (filter === "PENDING") matchesStatus = status === "pending";
    if (filter === "CONFIRMED") matchesStatus = status === "confirmed";
    if (filter === "CANCELLED") matchesStatus = status === "cancelled";

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      (item.client_name || "").toLowerCase().includes(query) ||
      (item.client_email || "").toLowerCase().includes(query) ||
      (item.client_phone || "").includes(query) ||
      (item.service_name || "").toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Acceso Administrador</h2>
          <p className="text-xs text-slate-500 mb-6">
            Ingresa tu PIN o contraseña de acceso para gestionar las citas.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Ingresa tu clave"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-center text-lg tracking-widest outline-none transition-all ${
                  pinError
                    ? "border-rose-500 bg-rose-50/50 text-rose-900"
                    : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                }`}
              />
              {pinError && (
                <p className="text-[11px] text-rose-500 font-semibold mt-2">
                  Clave incorrecta. Inténtalo de nuevo.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all cursor-pointer"
            >
              Ingresar al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 bg-grid-pattern text-slate-900 flex flex-col font-sans">
     {/* Header Admin */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              Actualizar
            </button>
          </div>
        </div>
      </header>

      {/* Panel Contenido */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Navigation Tabs con SVG Icons vectoriales */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("APPOINTMENTS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === "APPOINTMENTS"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === "APPOINTMENTS" ? "text-white" : "text-indigo-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Reservas y Citas
          </button>

          <button
            onClick={() => setActiveTab("BLOCKS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === "BLOCKS"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === "BLOCKS" ? "text-white" : "text-rose-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Bloqueos de Agenda
          </button>

          <button
            onClick={() => setActiveTab("SETTINGS")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === "SETTINGS"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === "SETTINGS" ? "text-white" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuración
          </button>
        </div>

        {/* Tab 1: Citas y Reservas */}
        {activeTab === "APPOINTMENTS" ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden p-6">
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">Citas Programadas</h2>
            <p className="text-xs text-slate-500 mb-6">Gestiona y confirma los turnos reservados por tus clientes.</p>

            {appointments.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-xs text-slate-400 font-medium">No hay citas registradas en el sistema.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <div key={apt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-900 text-sm">{apt.client_name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          apt.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                          apt.status === "CANCELLED" ? "bg-rose-100 text-rose-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Fecha: <span className="font-semibold text-slate-700">{apt.appointment_date}</span> | Hora: <span className="font-semibold text-slate-700">{apt.appointment_time}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Teléfono: <span className="font-medium text-slate-700">{apt.client_phone}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStatus(apt.id, "CONFIRMED")}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                       onClick={() => updateStatus(apt.id, "CANCELLED")}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "BLOCKS" ? (
          /* Tab 2: Bloqueos de Horario */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs h-fit">
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Bloquear Horario</h2>
              <p className="text-xs text-slate-500 mb-6">Inhabilita un horario o día completo.</p>

              <form onSubmit={handleAddBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha a bloquear</label>
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horario a bloquear</label>
                  <select
                    value={newBlockTime}
                    onChange={(e) => setNewBlockTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  >
                    <option value="ALL">Todo el día</option>
                    <option value="08:00">08:00 AM</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">01:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                    <option value="18:00">06:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motivo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Día festivo, vacaciones, mantenimiento"
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-100 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Guardar Bloqueo
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden p-6">
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Bloqueos Registrados</h2>
              <p className="text-xs text-slate-500 mb-6">Estas fechas y horas no estarán disponibles para los clientes.</p>

              {blockedSlots.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">No hay bloqueos activos actualmente.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {blockedSlots.map((slot) => (
                    <div key={slot.id} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{slot.blocked_date}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Hora:{" "}
                          <span className="font-semibold text-rose-600">
                            {slot.blocked_time === "ALL" ? "Día Completo" : slot.blocked_time}
                          </span>{" "}
                          | Motivo: {slot.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(slot.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Sección de Configuración del Negocio */
          <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">Configuración del Negocio</h2>
            <p className="text-xs text-slate-500 mb-6">
              Personaliza el nombre, canal de WhatsApp, colores y horario laboral general.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Negocio</label>
                <input
                  type="text"
                  value={settings.business_name || ""}
                  onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Número de WhatsApp (Notificaciones)</label>
                <input
                  type="text"
                  value={settings.whatsapp_number || ""}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora de Apertura</label>
                  <input
                    type="time"
                    value={settings.opening_time || "08:00"}
                    onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora de Cierre</label>
                  <input
                    type="time"
                    value={settings.closing_time || "18:00"}
                    onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duración del Turno (Minutos)</label>
                  <input
                    type="number"
                    min="15"
                    max="240"
                    step="15"
                    value={settings.slot_duration_minutes || 60}
                    onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Color Principal (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primary_color || "#3B82F6"}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-10 h-9 rounded-xl border border-slate-200 p-1 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={settings.primary_color || "#3B82F6"}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50 uppercase"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {savingSettings ? "Guardando..." : "Guardar Cambios"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
