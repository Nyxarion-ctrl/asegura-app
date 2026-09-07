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
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Actualizar
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Panel Contenido */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Selector de Pestañas Principales */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("APPOINTMENTS")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "APPOINTMENTS"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            📅 Reservas y Citas
          </button>
          <button
            onClick={() => setActiveTab("BLOCKS")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "BLOCKS"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            🚫 Bloqueos de Disponibilidad
          </button>
          <button
            onClick={() => setActiveTab("SETTINGS")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "SETTINGS"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            ⚙️ Configuración del Negocio
          </button>
        </div>

        {activeTab === "APPOINTMENTS" ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Gestión de Citas</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Revisa y gestiona las reservas recibidas desde tu plataforma.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCancelledAppointments}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Limpiar Canceladas
                </button>
                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200/80 shadow-sm text-xs font-medium">
                  Total Citas: <span className="font-bold text-indigo-600">{filteredAppointments.length}</span>
                </div>
              </div>
            </div>

            {/* Controles: Buscador + Pestañas de Filtro */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center justify-between">
              {/* Buscador Integrado */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Buscar por cliente, teléfono, email o servicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Pestañas de Filtro por Estado */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "ALL", label: "Todas" },
                  { id: "PENDING", label: "Pendientes" },
                  { id: "CONFIRMED", label: "Confirmadas" },
                  { id: "CANCELLED", label: "Canceladas" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      filter === tab.id
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de Citas */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-400">Cargando citas...</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  No hay citas registradas con estos criterios.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Servicio</th>
                        <th className="p-4">Fecha y Hora</th>
                        <th className="p-4">Precio</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredAppointments.map((item) => {
                        const currentStatus = (item.status || "pending").toLowerCase();

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-slate-900">{item.client_name}</p>
                              <p className="text-slate-400 text-[11px]">{item.client_email}</p>
                              <p className="text-slate-400 text-[11px]">{item.client_phone}</p>
                            </td>
                            <td className="p-4 font-medium text-slate-800">{item.service_name}</td>
                            <td className="p-4">
                              <p className="font-semibold text-slate-900">{item.appointment_date}</p>
                              <p className="text-slate-400 text-[11px]">{item.appointment_time}</p>
                            </td>
                            <td className="p-4 font-extrabold text-slate-900">{item.service_price}</td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                                  currentStatus === "confirmed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : currentStatus === "cancelled"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    currentStatus === "confirmed"
                                      ? "bg-emerald-500"
                                      : currentStatus === "cancelled"
                                      ? "bg-rose-500"
                                      : "bg-amber-500"
                                  }`}
                                />
                                {item.status || "PENDING"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => sendWhatsAppNotification(item)}
                                  title="Enviar recordatorio por WhatsApp"
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 fill-emerald-600" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                  </svg>
                                  WhatsApp
                                </button>

                                {currentStatus !== "confirmed" && (
                                  <button
                                    onClick={() => updateStatus(item.id, "CONFIRMED")}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold shadow-sm shadow-indigo-100 transition-all cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                )}
                                {currentStatus !== "cancelled" && (
                                  <button
                                    onClick={() => updateStatus(item.id, "CANCELLED")}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteAppointment(item.id)}
                                  title="Eliminar registro"
                                  className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "BLOCKS" ? (
          /* Sección de Gestión de Bloqueos */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulario para nuevo bloqueo */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm h-fit">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Bloquear Disponibilidad</h2>
              <p className="text-xs text-slate-500 mb-6">Inhabilita un día completo o una hora específica.</p>

              <form onSubmit={handleAddBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horario a bloquear</label>
                  <select
                    value={newBlockTime}
                    onChange={(e) => setNewBlockTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="ALL">Día Completo (Festivo/No laboral)</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motivo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Día festivo, vacaciones, mantenimiento"
                    value={newBlockReason}
                    onChange={(e) => setNewBlockReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Guardar Bloqueo
                </button>
              </form>
            </div>

            {/* Lista de Bloqueos Activos */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Bloqueos Registrados</h2>
              <p className="text-xs text-slate-500 mb-6">Estas fechas y horas no estarán disponibles para los clientes.</p>

              {blockedSlots.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No hay bloqueos activos actualmente.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {blockedSlots.map((slot) => (
                    <div key={slot.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{slot.blocked_date}</p>
                        <p className="text-slate-500 text-[11px]">
                          Hora:{" "}
                          <span className="font-semibold text-rose-600">
                            {slot.blocked_time === "ALL" ? "Día Completo" : slot.blocked_time}
                          </span>{" "}
                          | Motivo: {slot.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(slot.id)}
                        className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-[11px] font-medium transition-all cursor-pointer"
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
          <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Configuración del Negocio</h2>
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Número de WhatsApp (Notificaciones)</label>
                <input
                  type="text"
                  value={settings.whatsapp_number || ""}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora de Cierre</label>
                  <input
                    type="time"
                    value={settings.closing_time || "18:00"}
                    onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
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
                      className="w-10 h-9 rounded-xl border border-slate-200 p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primary_color || "#3B82F6"}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
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
