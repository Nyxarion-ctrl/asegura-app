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

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELLED">("ALL");

  useEffect(() => {
    const savedAuth = localStorage.getItem("admin_authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
      fetchAppointments();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      localStorage.setItem("admin_authenticated", "true");
      fetchAppointments();
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    setPinInput("");
  };

  const fetchAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAppointments(data as Appointment[]);
    } else if (error) {
      console.error("Error al obtener citas:", error.message);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: "CONFIRMED" | "CANCELLED" | "confirmed" | "cancelled") => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Error al actualizar el estado: " + error.message);
    } else {
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    }
  };

  // Eliminar una cita individual
  const deleteAppointment = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta cita permanentemente?")) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error al eliminar la cita: " + error.message);
    } else {
      setAppointments((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Eliminar todas las citas canceladas
  const clearCancelledAppointments = async () => {
    if (!confirm("¿Deseas eliminar permanentemente TODAS las citas canceladas?")) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .ilike("status", "cancelled");

    if (error) {
      alert("Error al limpiar citas canceladas: " + error.message);
    } else {
      setAppointments((prev) =>
        prev.filter((item) => (item.status || "").toLowerCase() !== "cancelled")
      );
      alert("Citas canceladas eliminadas correctamente.");
    }
  };

  const filteredAppointments = appointments.filter((item) => {
    const status = (item.status || "pending").toLowerCase();
    if (filter === "PENDING") return status === "pending";
    if (filter === "CONFIRMED") return status === "confirmed";
    if (filter === "CANCELLED") return status === "cancelled";
    return true;
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
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all"
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
              onClick={fetchAppointments}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all flex items-center gap-1.5"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Panel Contenido */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
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
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              🗑️ Limpiar Canceladas
            </button>
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200/80 shadow-sm text-xs font-medium">
              Total Citas: <span className="font-bold text-slate-900">{filteredAppointments.length}</span>
            </div>
          </div>
        </div>

        {/* Pestañas de Filtro */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3 overflow-x-auto">
          {[
            { id: "ALL", label: "Todas" },
            { id: "PENDING", label: "Pendientes" },
            { id: "CONFIRMED", label: "Confirmadas" },
            { id: "CANCELLED", label: "Canceladas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tabla de Citas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Cargando citas...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No hay citas registradas en esta categoría.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{item.client_name}</p>
                          <p className="text-slate-400 text-[11px]">{item.client_email}</p>
                          <p className="text-slate-400 text-[11px]">{item.client_phone}</p>
                        </td>
                        <td className="p-4 font-medium text-slate-800">{item.service_name}</td>
                        <td className="p-4">
                          <p className="font-medium text-slate-900">{item.appointment_date}</p>
                          <p className="text-slate-400 text-[11px]">{item.appointment_time}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-900">{item.service_price}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              currentStatus === "confirmed"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : currentStatus === "cancelled"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {item.status || "pending"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {currentStatus !== "confirmed" && (
                            <button
                              onClick={() => updateStatus(item.id, "CONFIRMED")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-medium transition-all"
                            >
                              Confirmar
                            </button>
                          )}
                          {currentStatus !== "cancelled" && (
                            <button
                              onClick={() => updateStatus(item.id, "CANCELLED")}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-all"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => deleteAppointment(item.id)}
                            title="Eliminar cita"
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-medium transition-all border border-rose-200"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
