"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Inicialización del cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- TIPOS DE DATOS ---
export interface Service {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
}

export interface BlockedSlot {
  id: string;
  business_id: string;
  blocked_date: string;
  blocked_time: string; // 'ALL' o formato 'HH:MM'
  reason?: string;
}

export interface BusinessSettings {
  id?: string;
  business_name: string;
  whatsapp_number: string;
  opening_time: string;
  closing_time: string;
  slot_duration_minutes: number;
  primary_color: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"services" | "blocks" | "settings">("services");
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de Datos
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: "",
    whatsapp_number: "",
    opening_time: "08:00",
    closing_time: "18:00",
    slot_duration_minutes: 60,
    primary_color: "#3B82F6",
  });

  // Estados de Formularios
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Formulario Servicio
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: "", // Formato decimal (ej: "15.00")
  });

  // Formulario Bloqueo
  const [newBlock, setNewBlock] = useState({
    blocked_date: "",
    blocked_time: "ALL",
    reason: "",
  });

  // --- CARGA INICIAL DE DATOS ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // 1. Obtener la sesión del usuario activo
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Cargar la configuración del negocio del usuario
      const { data: bData, error: bError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (bError && bError.code !== "PGRST116") throw bError;

      if (bData) {
        setBusinessId(bData.id);
        setSettings({
          id: bData.id,
          business_name: bData.business_name || "",
          whatsapp_number: bData.whatsapp_number || "",
          opening_time: bData.opening_time || "08:00",
          closing_time: bData.closing_time || "18:00",
          slot_duration_minutes: bData.slot_duration_minutes || 60,
          primary_color: bData.primary_color || "#3B82F6",
        });

        // 3. Cargar Servicios
        const { data: sData } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", bData.id);
        if (sData) setServices(sData);

        // 4. Cargar Bloqueos
        const { data: blockData } = await supabase
          .from("blocked_slots")
          .select("*")
          .eq("business_id", bData.id);
        if (blockData) setBlockedSlots(blockData);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADORES DE SERVICIOS ---
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    // Convertir el precio decimal a centavos (ej: 15.50 -> 1550)
    const priceCents = Math.round(parseFloat(newService.price) * 100);

    const payload = {
      business_id: businessId,
      name: newService.name,
      description: newService.description,
      duration_minutes: Number(newService.duration_minutes),
      price_cents: isNaN(priceCents) ? 0 : priceCents,
    };

    const { data, error } = await supabase
      .from("services")
      .insert([payload])
      .select()
      .single();

    if (error) {
      alert("Error creando el servicio: " + error.message);
      return;
    }

    setServices([...services, data]);
    setNewService({
      name: "",
      description: "",
      duration_minutes: 30,
      price: "",
    });
  };

  const handleDeleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      alert("Error al eliminar el servicio");
      return;
    }
    setServices(services.filter((s) => s.id !== id));
  };

  // --- MANEJADORES DE BLOQUEOS ---
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !newBlock.blocked_date) return;

    const payload = {
      business_id: businessId,
      blocked_date: newBlock.blocked_date,
      blocked_time: newBlock.blocked_time,
      reason: newBlock.reason,
    };

    const { data, error } = await supabase
      .from("blocked_slots")
      .insert([payload])
      .select()
      .single();

    if (error) {
      alert("Error al registrar el bloqueo: " + error.message);
      return;
    }

    setBlockedSlots([...blockedSlots, data]);
    setNewBlock({ blocked_date: "", blocked_time: "ALL", reason: "" });
  };

  const handleDeleteBlock = async (id: string) => {
    const { error } = await supabase
      .from("blocked_slots")
      .delete()
      .eq("id", id);
    if (error) {
      alert("Error al eliminar el bloqueo");
      return;
    }
    setBlockedSlots(blockedSlots.filter((b) => b.id !== id));
  };

  // --- MANEJADOR DE CONFIGURACIÓN ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        owner_id: user.id,
        business_name: settings.business_name,
        whatsapp_number: settings.whatsapp_number,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        slot_duration_minutes: settings.slot_duration_minutes,
        primary_color: settings.primary_color,
      };

      let result;
      if (businessId) {
        result = await supabase
          .from("businesses")
          .update(payload)
          .eq("id", businessId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("businesses")
          .insert([payload])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (result.data) {
        setBusinessId(result.data.id);
        alert("Configuración guardada exitosamente.");
      }
    } catch (error: any) {
      alert("Error al guardar la configuración: " + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-medium">
        Cargando el panel de administración...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Navegación Superior */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
              {settings.business_name
                ? settings.business_name.charAt(0).toUpperCase()
                : "A"}
            </div>
            <h1 className="font-extrabold text-slate-900 text-sm tracking-tight">
              {settings.business_name || "Mi Negocio"}
            </h1>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "services"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Servicios
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("blocks")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "blocks"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bloqueos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Configuración
            </button>
          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "services" ? (
          /* Tab 1: Gestión de Servicios */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulario Agregar Servicio */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs h-fit">
              <h2 className="text-sm font-extrabold text-slate-900 mb-1">
                Nuevo Servicio
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Añade una opción al menú de tus clientes.
              </p>

              <form onSubmit={handleCreateService} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Corte de Cabello"
                    value={newService.name}
                    onChange={(e) =>
                      setNewService({ ...newService, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Breve detalle del servicio..."
                    value={newService.description}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Duración (min)
                    </label>
                    <input
                      type="number"
                      required
                      min="15"
                      step="15"
                      value={newService.duration_minutes}
                      onChange={(e) =>
                        setNewService({
                          ...newService,
                          duration_minutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Precio ($)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="0.00"
                      value={newService.price}
                      onChange={(e) =>
                        setNewService({ ...newService, price: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!businessId}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  Guardar Servicio
                </button>
              </form>
            </div>

            {/* Lista de Servicios */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
              <h2 className="text-sm font-extrabold text-slate-900 mb-1">
                Catálogo de Servicios
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Servicios activos para agendamiento público.
              </p>

              {services.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">
                    No has configurado ningún servicio aún.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {service.name}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded-md text-[10px]">
                            {service.duration_minutes} min
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {service.description}
                          </p>
                        )}
                        <p className="font-extrabold text-indigo-600 text-xs mt-1">
                          ${(service.price_cents / 100).toFixed(2)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.id)}
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
        ) : activeTab === "blocks" ? (
          /* Tab 2: Bloqueos de Agenda */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulario Crear Bloqueo */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs h-fit">
              <h2 className="text-sm font-extrabold text-slate-900 mb-1">
                Bloquear Horario
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Inhabilita horas o días para no recibir citas.
              </p>

              <form onSubmit={handleCreateBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={newBlock.blocked_date}
                    onChange={(e) =>
                      setNewBlock({ ...newBlock, blocked_date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora o Rango
                  </label>
                  <select
                    value={newBlock.blocked_time}
                    onChange={(e) =>
                      setNewBlock({ ...newBlock, blocked_time: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  >
                    <option value="ALL">Día Completo</option>
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
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Almuerzo, Mantenimiento..."
                    value={newBlock.reason}
                    onChange={(e) =>
                      setNewBlock({ ...newBlock, reason: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!businessId}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  Registrar Bloqueo
                </button>
              </form>
            </div>

            {/* Lista de Bloqueos Registrados */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden p-6">
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">
                Bloqueos Registrados
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Estas fechas y horas no estarán disponibles para los clientes.
              </p>

              {blockedSlots.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">
                    No hay bloqueos activos actualmente.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {blockedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {slot.blocked_date}
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Hora:{" "}
                          <span className="font-semibold text-rose-600">
                            {slot.blocked_time === "ALL"
                              ? "Día Completo"
                              : slot.blocked_time}
                          </span>{" "}
                          | Motivo: {slot.reason || "Sin especificar"}
                        </p>
                      </div>
                      <button
                        type="button"
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
          /* Tab 3: Sección de Configuración del Negocio */
          <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">
              Configuración del Negocio
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Personaliza el nombre, canal de WhatsApp, colores y horario laboral
              general.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  value={settings.business_name || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, business_name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de WhatsApp (Notificaciones)
                </label>
                <input
                  type="text"
                  value={settings.whatsapp_number || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp_number: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora de Apertura
                  </label>
                  <select
                    value={settings.opening_time || "08:00"}
                    onChange={(e) =>
                      setSettings({ ...settings, opening_time: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    required
                  >
                    <option value="06:00">06:00 AM</option>
                    <option value="07:00">07:00 AM</option>
                    <option value="08:00">08:00 AM</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hora de Cierre
                  </label>
                  <select
                    value={settings.closing_time || "18:00"}
                    onChange={(e) =>
                      setSettings({ ...settings, closing_time: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    required
                  >
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                    <option value="18:00">06:00 PM</option>
                    <option value="19:00">07:00 PM</option>
                    <option value="20:00">08:00 PM</option>
                    <option value="21:00">09:00 PM</option>
                    <option value="22:00">10:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duración del Turno (Minutos)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="240"
                    step="15"
                    value={settings.slot_duration_minutes || 60}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        slot_duration_minutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Color Principal (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primary_color || "#3B82F6"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          primary_color: e.target.value,
                        })
                      }
                      className="w-10 h-9 rounded-xl border border-slate-200 p-1 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={settings.primary_color || "#3B82F6"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          primary_color: e.target.value,
                        })
                      }
                      className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all bg-slate-50/50 uppercase"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar Sesión
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
