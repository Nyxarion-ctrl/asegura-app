'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Calendar, Clock, Car, Shield, CheckCircle2, User, Phone, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Inicialización de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Servicios predeterminados (puedes ajustar nombres y precios según tu cliente)
const SERVICES = [
  { id: '1', name: 'Inspección General de Seguridad', duration: '45 min', price: '$25.00' },
  { id: '2', name: 'Revisión del Sistema de Frenos', duration: '30 min', price: '$20.00' },
  { id: '3', name: 'Evaluación Técnica Completa', duration: '60 min', price: '$40.00' },
]

// Horarios disponibles de trabajo
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00'
]

export default function Home() {
  const [selectedService, setSelectedService] = useState(SERVICES[0])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Datos del cliente
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [notes, setNotes] = useState('')

  // Estados de interfaz
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0]

  // Cargar horas ocupadas/bloqueadas cuando cambia la fecha seleccionada
  useEffect(() => {
    if (!selectedDate) return

    async function fetchOccupiedSlots() {
      setLoadingSlots(true)
      try {
        // 1. Obtener citas agendadas que no estén canceladas
        const { data: appointments } = await supabase
          .from('appointments')
          .select('time')
          .eq('date', selectedDate)
          .neq('status', 'cancelled')

        // 2. Obtener bloqueos de disponibilidad
        const { data: blocks } = await supabase
          .from('blocked_slots')
          .select('time')
          .eq('date', selectedDate)

        const appTimes = appointments ? appointments.map(a => a.time) : []
        const blockTimes = blocks ? blocks.map(b => b.time) : []

        // Unir ambas listas de horarios no disponibles
        setOccupiedSlots([...appTimes, ...blockTimes])
      } catch (err) {
        console.error('Error al cargar disponibilidad:', err)
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchOccupiedSlots()
  }, [selectedDate])

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('appointments').insert([
        {
          service_name: selectedService.name,
          date: selectedDate,
          time: selectedTime,
          client_name: clientName,
          client_phone: clientPhone,
          vehicle_info: vehicleInfo,
          notes: notes,
          status: 'pending'
        }
      ])

      if (error) throw error

      setBookingSuccess(true)
    } catch (err) {
      console.error(err)
      alert('Ocurrió un error al guardar la reserva. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setIsModalOpen(false)
    setBookingSuccess(false)
    setSelectedDate('')
    setSelectedTime('')
    setClientName('')
    setClientPhone('')
    setVehicleInfo('')
    setNotes('')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      
      {/* HEADER / NAVBAR */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-blue-500" />
            <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              ASEGURA
            </span>
          </div>
          <a
            href="#reserva"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all"
          >
            Agendar Cita
          </a>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-5xl mx-auto px-4 py-10 w-full space-y-12">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Reserva tu inspección en segundos
          </h1>
          <p className="text-slate-400 text-lg">
            Selecciona el servicio que necesitas, elige el horario que mejor se adapte a ti y confirma tu cita sin complicaciones.
          </p>
        </section>

        {/* RESERVATION FORM CONTAINER */}
        <section id="reserva" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-8">
          
          {/* PASO 1: SERVICIO */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">1</span>
              Selecciona un Servicio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SERVICES.map((srv) => {
                const isSelected = selectedService.id === srv.id
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold text-white">{srv.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {srv.duration}
                      </p>
                    </div>
                    <div className="text-right font-bold text-blue-400 text-lg">
                      {srv.price}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* PASO 2: FECHA Y HORA */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-bold">2</span>
              Selecciona Fecha y Hora
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Selector de Fecha */}
              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium block">Fecha disponible</label>
                <div className="relative">
                  <input
                    type="date"
                    min={today}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value)
                      setSelectedTime('')
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Grid de Horarios */}
              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium block">Horario disponible</label>
                {!selectedDate ? (
                  <p className="text-sm text-slate-500 italic py-2">Selecciona primero una fecha para ver horarios.</p>
                ) : loadingSlots ? (
                  <p className="text-sm text-slate-400 py-2 animate-pulse">Cargando disponibilidad...</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map((time) => {
                      const isOccupied = occupiedSlots.includes(time)
                      const isSelected = selectedTime === time

                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all text-center ${
                            isOccupied
                              ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-blue-500/50'
                          }`}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* BOTÓN CONTINUAR */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              disabled={!selectedDate || !selectedTime}
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              Continuar Reserva <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </section>

      </main>

      {/* FOOTER DISCRETO CON ENLACE ADMIN */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 Asegura-App. Todos los derechos reservados.</p>
        <div>
          <Link href="/admin" className="text-slate-600 hover:text-slate-400 transition-colors underline">
            Acceso Administrativo
          </Link>
        </div>
      </footer>

      {/* MODAL FORMULARIO DE CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
            
            {!bookingSuccess ? (
              <>
                <div>
                  <h3 className="text-xl font-bold text-white">Completa tus Datos</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedService.name} - {selectedDate} a las {selectedTime} hs.
                  </p>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block font-medium">Nombre Completo</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Carlos Mendoza"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block font-medium">Teléfono / WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type="tel"
                        required
                        placeholder="Ej. +809 555 1234"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block font-medium">Vehículo / Placa</label>
                    <div className="relative">
                      <Car className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Honda Civic 2020 - A123456"
                        value={vehicleInfo}
                        onChange={(e) => setVehicleInfo(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block font-medium">Notas o Comentarios (Opcional)</label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <textarea
                        rows={2}
                        placeholder="Algún detalle adicional sobre la revisión..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-1/2 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {isSubmitting ? 'Guardando...' : 'Confirmar Cita'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                <h3 className="text-2xl font-bold text-white">¡Reserva Confirmada!</h3>
                <p className="text-sm text-slate-400">
                  Gracias <strong className="text-white">{clientName}</strong>, tu cita para <strong className="text-white">{selectedService.name}</strong> ha sido agendada con éxito para el <strong className="text-white">{selectedDate}</strong> a las <strong className="text-white">{selectedTime} hs</strong>.
                </p>
                <div className="pt-4 space-y-2">
                  <button
                    onClick={resetForm}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors text-sm"
                  >
                    Hacer otra reserva
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
