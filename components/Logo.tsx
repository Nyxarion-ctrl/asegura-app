interface LogoProps {
  className?: string;
  isAdmin?: boolean;
}

export default function Logo({ className = "h-9", isAdmin = false }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Icono Isotipo SVG */}
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-900 p-[1px] shadow-lg shadow-indigo-500/20 shrink-0">
        <div className="w-full h-full bg-slate-950/40 backdrop-blur-md rounded-[11px] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-white"
          >
            {/* Trazo del escudo / Letra A */}
            <path d="M12 3L4 7v6c0 5.25 3.5 10 8 11 4.5-1 8-5.75 8-11V7l-8-4z" className="text-indigo-400/40" />
            <path d="M12 7L7 16h10L12 7z" strokeWidth="2" />
            {/* Check sutil central */}
            <path d="M9 13.5l2 2 4-4" className="text-emerald-400" strokeWidth="2.5" />
          </svg>
        </div>
      </div>

      {/* Tipografía de la marca */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-sans leading-none">
            Asegura<span className="text-indigo-600 dark:text-indigo-400">.</span>
          </span>

          {/* Badges para el Admin */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-md leading-none">
                v1.0
              </span>
              <span className="text-[9px] font-extrabold text-white bg-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wider leading-none shadow-xs">
                ADMIN
              </span>
            </div>
          )}
        </div>

        <span className="text-[10px] font-medium tracking-widest text-slate-400 uppercase leading-tight mt-1">
          {isAdmin ? "Smart Booking System" : "Smart Booking"}
        </span>
      </div>
    </div>
  );
}
