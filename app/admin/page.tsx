"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Logo from "@/components/Logo";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const CLIENT_ADMIN_EMAIL = "asegura.admin@gmail.com";
const SUPER_ADMIN_EMAIL = "cristianmanuelhd@gmail.com";

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
  blocked_time: string;
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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"services" | "bookings" | "blocks" | "settings">("settings");
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de Datos
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: "Asegura Demo",
    whatsapp_number: "8090000000",
    opening_time: "06:00 AM",
    closing_time: "04:00 PM",
    slot_duration_minutes: 60,
    primary_color: "#3B82F6",
  });

  // Formularios
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: "",
  });
  const [creatingService, setCreatingService] = useState<boolean>(false);

  const [newBlock, setNewBlock] = useState({
    blocked_date: "",
    blocked_time: "Todo el día",
    reason: "",
  });
  const [creatingBlock, setCreatingBlock] = useState<boolean>(false);

  const [savingSettings, setSavingSettings] = useState<boolean>(false);

const [currentUserEmail, setUserEmail] = useState<string | undefined>("");

useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email;

    // Si no hay sesión o el correo no es ninguno de los dos autorizados, redirige
    if (!session || (userEmail !== SUPER_ADMIN_EMAIL && userEmail !== CLIENT_ADMIN_EMAIL)) {
      window.location.href = "/admin/login";
    } else {
      setUserEmail(userEmail); // Guardamos el email activo en el estado
      fetchInitialData();
    }
  };

  checkAuth();
}, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bData } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (bData) {
        setBusinessId(bData.id);
        setSettings({
          id: bData.id,
          business_name: bData.business_name || "Asegura Demo",
          whatsapp_number: bData.whatsapp_number || "8090000000",
          opening_time: bData.opening_time || "06:00 AM",
          closing_time: bData.closing_time || "04:00 PM",
          slot_duration_minutes: bData.slot_duration_minutes || 60,
          primary_color: bData.primary_color || "#3B82F6",
        });

        const { data: sData } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", bData.id);
        if (sData) setServices(sData);

        const { data: blockData } = await supabase
          .from("blocked_slots")
          .select("*")
          .eq("business_id", bData.id);
        if (blockData) setBlockedSlots(blockData);
      }
    } catch (error) {
      console.error("Error al obtener datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !newService.name) return;

    try {
      setCreatingService(true);
      const priceCents = Math.round(parseFloat(newService.price || "0") * 100);

      const payload = {
        business_id: businessId,
        name: newService.name,
        description: newService.description,
        duration_minutes: Number(newService.duration_minutes),
        price_cents: priceCents,
      };

      const { data, error } = await supabase
        .from("services")
        .insert([payload])
        .select()
        .single();

      if (error) {
        alert("Error al guardar servicio: " + error.message);
        return;
      }

      setServices([...services, data]);
      setNewService({ name: "", description: "", duration_minutes: 30, price: "" });
    } catch (err) {
      alert("Error procesando servicio.");
    } finally {
      setCreatingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("¿Deseas eliminar este servicio?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (!error) setServices(services.filter((s) => s.id !== id));
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !newBlock.blocked_date) return;

    try {
      setCreatingBlock(true);
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
        alert("Error al guardar bloqueo: " + error.message);
        return;
      }

      setBlockedSlots([...blockedSlots, data]);
      setNewBlock({ blocked_date: "", blocked_time: "Todo el día", reason: "" });
    } catch (err) {
      alert("Error procesando bloqueo.");
    } finally {
      setCreatingBlock(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
    if (!error) setBlockedSlots(blockedSlots.filter((b) => b.id !== id));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
  e.preventDefault();
  setSavingSettings(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
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
        .from("business_settings")
        .update(payload)
        .eq("id", businessId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("business_settings")
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) {
      alert("Error al guardar: " + result.error.message);
    } else {
      if (result.data) setBusinessId(result.data.id);
      alert("¡Configuración guardada exitosamente!");
      fetchInitialData();
    }
  } catch (error: any) {
    alert("Error general al guardar: " + error.message);
  } finally {
    setSavingSettings(false);
  }
};
    
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs font-semibold text-slate-400">
        Cargando Panel...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f8fafc] text-slate-800 relative font-sans antialiased"
      style={{
        backgroundImage: `radial-gradient(#cbd5e1 1.5px, transparent 1.5px)`,
        backgroundSize: `20px 20px`,
      }}
    >
      <div className="max-w-6xl mx-auto px-8 py-8">

       {/* HEADER IDENTICO A LA PRIMERA IMAGEN */}
<header className="flex items-center justify-between mb-8">
        <Logo isAdmin={true} />

        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/admin/login";
            }}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-all cursor-pointer px-3 py-2"
          >
            Cerrar Sesión
          </button>

          <button
            onClick={fetchInitialData}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar Agenda
          </button>
        </div>
      </header>

        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "services"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Servicios
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "bookings"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Reservas y Citas
          </button>

          <button
            onClick={() => setActiveTab("blocks")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "blocks"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            Bloqueos de Agenda
          </button>

         {currentUserEmail === SUPER_ADMIN_EMAIL && (
  <button
    onClick={() => setActiveTab("settings")}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
      activeTab === "settings"
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
    }`}
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    Configuración
  </button>
)}
        </div>

        {/* PESTAÑA SERVICIOS */}
        {activeTab === "services" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs h-fit">
              <h2 className="text-base font-extrabold text-slate-900 mb-0.5">Nuevo Servicio</h2>
              <p className="text-xs text-slate-400 font-medium mb-6">Añade una opción al menú de tus clientes.</p>

              <form onSubmit={handleCreateService} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Corte de Cabello"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Descripción</label>
                  <textarea
                    rows={2}
                    placeholder="Breve detalle del servicio..."
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Duración (min)</label>
                    <input
                      type="number"
                      required
                      value={newService.duration_minutes}
                      onChange={(e) => setNewService({ ...newService, duration_minutes: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Precio ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingService}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer mt-2"
                >
                  {creatingService ? "Guardando..." : "Guardar Servicio"}
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <h2 className="text-base font-extrabold text-slate-900 mb-0.5">Catálogo de Servicios</h2>
              <p className="text-xs text-slate-400 font-medium mb-6">Servicios activos para agendamiento público.</p>

              {services.length === 0 ? (
                <div className="border-2 border-dashed border-slate-100/90 rounded-2xl py-16 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    No has configurado ningún servicio aún.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-extrabold text-slate-900">{item.name}</h3>
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            ${(item.price_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <p className="text-[10px] font-bold text-slate-400 mt-2">⏱ {item.duration_minutes} mins</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                        <button
                          onClick={() => handleDeleteService(item.id)}
                          className="text-[11px] text-rose-600 font-bold hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA RESERVAS Y CITAS */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <h2 className="text-lg font-extrabold text-slate-900 mb-0.5">Citas Programadas</h2>
            <p className="text-xs text-slate-400 font-medium mb-8">
              Gestiona y confirma los turnos reservados por tus clientes.
            </p>

            <div className="border-2 border-dashed border-slate-100 rounded-2xl py-20 text-center">
              <p className="text-xs font-semibold text-slate-400">
                No hay citas registradas en el sistema.
              </p>
            </div>
          </div>
        )}

        {/* PESTAÑA BLOQUEOS DE AGENDA */}
        {activeTab === "blocks" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs h-fit">
              <h2 className="text-base font-extrabold text-slate-900 mb-0.5">Bloquear Horario</h2>
              <p className="text-xs text-slate-400 font-medium mb-6">Inhabilita un horario o día completo.</p>

              <form onSubmit={handleCreateBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Fecha a bloquear</label>
                  <input
                    type="date"
                    required
                    value={newBlock.blocked_date}
                    onChange={(e) => setNewBlock({ ...newBlock, blocked_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Horario a bloquear</label>
                  <select
                    value={newBlock.blocked_time}
                    onChange={(e) => setNewBlock({ ...newBlock, blocked_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  >
                    <option value="Todo el día">Todo el día</option>
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Motivo (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Día festivo, mantenimiento"
                    value={newBlock.reason}
                    onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingBlock}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-100 transition-all cursor-pointer mt-2"
                >
                  {creatingBlock ? "Guardando..." : "Guardar Bloqueo"}
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <h2 className="text-base font-extrabold text-slate-900 mb-0.5">Bloqueos Registrados</h2>
              <p className="text-xs text-slate-400 font-medium mb-6">
                Estas fechas y horas no estarán disponibles para los clientes.
              </p>

              {blockedSlots.length === 0 ? (
                <div className="border-2 border-dashed border-slate-100 rounded-2xl py-16 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    No hay bloqueos activos actualmente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-4 bg-slate-50/60 rounded-2xl border border-slate-100"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{slot.blocked_date}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {slot.blocked_time} {slot.reason ? `• ${slot.reason}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(slot.id)}
                        className="px-3 py-1.5 text-xs text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 rounded-xl transition-all"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA CONFIGURACIÓN */}
       {activeTab === "settings" && currentUserEmail === SUPER_ADMIN_EMAIL && (
          <div className="max-w-xl bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <h2 className="text-lg font-extrabold text-slate-900 mb-0.5">Configuración del Negocio</h2>
            <p className="text-xs text-slate-400 font-medium mb-6">
              Personaliza el nombre, canal de WhatsApp, colores y horario laboral general.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Nombre del Negocio</label>
                <input
                  type="text"
                  value={settings.business_name}
                  onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Número de WhatsApp (Notificaciones)</label>
                <input
                  type="text"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Hora de Apertura</label>
                  <select
                    value={settings.opening_time}
                    onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  >
                    <option value="06:00 AM">06:00 AM</option>
                    <option value="07:00 AM">07:00 AM</option>
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Hora de Cierre</label>
                  <select
                    value={settings.closing_time}
                    onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  >
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                    <option value="07:00 PM">07:00 PM</option>
                  </select>
                </div>
              </div>

          <div className="w-full">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Duración del Turno (Minutos)</label>
            <input
              type="number"
              value={settings.slot_duration_minutes}
              onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer mt-4 disabled:opacity-50"
          >
            {savingSettings ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
     </div>
      )}
    </div>
  );
}
