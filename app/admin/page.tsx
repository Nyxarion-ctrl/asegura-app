"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Actualización optimista de la UI
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

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
          <button
            onClick={fetchAppointments}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all flex items-center gap-1.5"
          >
            🔄 Actualizar Tabla
          </button>
        </div>
      </header>

      {/* Panel Contenido */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Gestión de Citas</h1>
            <p className="text-xs text-slate-500 mt-1">
              Revisa y gestiona las reservas recibidas desde tu plataforma.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200/80 shadow-sm text-xs font-medium">
              Total Citas: <span className="font-bold text-slate-900">{appointments.length}</span>
            </div>
          </div>
        </div>

        {/* Tabla de Citas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Cargando citas...</div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No hay citas registradas en el sistema aún.
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
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {appointments.map((item) => {
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
