import { ExternalLink, Gamepad2, GraduationCap, MapPin } from 'lucide-react';

export function GameSpotlight() {
  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-amber-950 shadow-2xl">
      <div className="relative isolate">
        <div className="absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(circle_at_18%_20%,rgba(34,197,94,.35),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(245,158,11,.28),transparent_24%),linear-gradient(135deg,transparent_0_48%,rgba(255,255,255,.035)_49%_51%,transparent_52%_100%)]" />

        <div className="grid gap-0 lg:grid-cols-[1.2fr_.8fr]">
          <div className="p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.18em] text-emerald-300">
                <Gamepad2 className="h-3.5 w-3.5" />
                GeekoPlay Games
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                Em destaque
              </span>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[.22em] text-amber-300/90">
              História • Educação • Aventura
            </p>

            <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Blumenau — A Origem
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              Uma experiência educativa para explorar a história da colonização de Blumenau jogando.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/75">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <GraduationCap className="h-4 w-4 text-emerald-300" />
                Educacional
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <MapPin className="h-4 w-4 text-amber-300" />
                Blumenau • SC
              </span>
            </div>

            <a
              href="https://www.blumenauaorigem.tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Jogar agora
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="relative min-h-52 overflow-hidden border-t border-white/10 lg:min-h-full lg:border-l lg:border-t-0">
            <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(16,185,129,.22),rgba(15,23,42,.4)_45%,rgba(245,158,11,.2))]" />
            <div className="absolute -left-10 top-8 h-40 w-40 rounded-full border border-emerald-300/20" />
            <div className="absolute right-6 top-10 h-28 w-28 rotate-12 rounded-3xl border border-amber-300/20 bg-amber-300/5" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Primeiro jogo</p>
              <p className="mt-1 text-lg font-black text-white">Descubra Blumenau jogando</p>
              <p className="mt-1 text-xs leading-5 text-white/60">
                O jogo abre em uma nova aba para você continuar conectado ao GeekoPlay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
