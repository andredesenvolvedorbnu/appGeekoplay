import { BookOpen, ExternalLink, Gamepad2, GraduationCap, MapPin } from 'lucide-react';

const games = [
  {
    title: 'Blumenau — A Origem',
    eyebrow: 'História • Educação • Aventura',
    description: 'Uma experiência educativa para explorar a história da colonização de Blumenau jogando.',
    href: 'https://www.blumenauaorigem.tech/',
    accent: 'emerald',
    tags: [
      { icon: GraduationCap, label: 'Educacional' },
      { icon: MapPin, label: 'Blumenau • SC' },
    ],
    footer: 'Descubra Blumenau jogando',
  },
  {
    title: 'Jesus: Sua História',
    eyebrow: 'Bíblico • Educação • Pixel Art',
    description: 'Uma aventura educativa em pixel art para conhecer a história de Jesus de forma interativa, respeitosa e envolvente.',
    href: 'https://jesusahistoria.com.br/',
    accent: 'amber',
    tags: [
      { icon: BookOpen, label: 'História bíblica' },
      { icon: GraduationCap, label: 'Educacional' },
    ],
    footer: 'Conheça a história jogando',
  },
] as const;

export function GameSpotlight() {
  return (
    <section className="mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[.18em] text-white/80">
            <Gamepad2 className="h-3.5 w-3.5" />
            GeekoPlay Games
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
            Jogue, explore e descubra
          </h2>
        </div>
        <span className="text-xs font-medium text-white/45">
          {games.length} jogos disponíveis
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {games.map((game) => {
          const isEmerald = game.accent === 'emerald';

          return (
            <article
              key={game.href}
              className={[
                'group relative isolate overflow-hidden rounded-3xl border border-white/10 shadow-2xl',
                isEmerald
                  ? 'bg-gradient-to-br from-emerald-950 via-slate-950 to-amber-950'
                  : 'bg-gradient-to-br from-amber-950 via-slate-950 to-stone-950',
              ].join(' ')}
            >
              <div
                className={[
                  'absolute inset-0 -z-10 opacity-50',
                  isEmerald
                    ? '[background-image:radial-gradient(circle_at_18%_20%,rgba(34,197,94,.35),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(245,158,11,.28),transparent_24%)]'
                    : '[background-image:radial-gradient(circle_at_18%_20%,rgba(245,158,11,.34),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(251,191,36,.18),transparent_24%)]',
                ].join(' ')}
              />

              <div className="flex min-h-full flex-col p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[.16em]',
                      isEmerald
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : 'border-amber-400/30 bg-amber-400/10 text-amber-300',
                    ].join(' ')}
                  >
                    Em destaque
                  </span>
                </div>

                <p
                  className={[
                    'mb-2 text-xs font-semibold uppercase tracking-[.18em]',
                    isEmerald ? 'text-amber-300/90' : 'text-amber-200/90',
                  ].join(' ')}
                >
                  {game.eyebrow}
                </p>

                <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {game.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/70">
                  {game.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/75">
                  {game.tags.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 ring-1 ring-white/10"
                    >
                      <Icon
                        className={[
                          'h-4 w-4',
                          isEmerald ? 'text-emerald-300' : 'text-amber-300',
                        ].join(' ')}
                      />
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-6">
                  <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                    <p
                      className={[
                        'text-xs font-semibold uppercase tracking-[.14em]',
                        isEmerald ? 'text-emerald-300' : 'text-amber-300',
                      ].join(' ')}
                    >
                      GeekoPlay Games
                    </p>
                    <p className="mt-1 text-base font-black text-white">{game.footer}</p>
                  </div>

                  <a
                    href={game.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={[
                      'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950',
                      isEmerald
                        ? 'bg-white hover:bg-emerald-300 focus:ring-emerald-300'
                        : 'bg-amber-200 hover:bg-amber-300 focus:ring-amber-300',
                    ].join(' ')}
                  >
                    Jogar agora
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
