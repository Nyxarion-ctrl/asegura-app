import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
  }

  // 1. Obtener citas activas para esa fecha (excluyendo canceladas)
  const { data: appointments } = await supabase
    .from("appointments")
    .select("appointment_time, status")
    .eq("appointment_date", date)
    .neq("status", "CANCELLED");

  // 2. Obtener bloqueos creados por el admin para esa fecha
  const { data: blocks } = await supabase
    .from("blocked_slots")
    .select("blocked_time")
    .eq("blocked_date", date);

  const reservedTimes = appointments ? appointments.map((a) => a.appointment_time) : [];
  const blockedTimes = blocks ? blocks.map((b) => b.blocked_time) : [];

  // Verificar si el día completo está bloqueado
  const isDayFullyBlocked = blockedTimes.includes("ALL");

  return NextResponse.json({
    reservedTimes,
    blockedTimes,
    isDayFullyBlocked,
  });
}
