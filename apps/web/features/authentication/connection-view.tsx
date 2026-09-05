import { MessageCircle, ShieldCheck } from 'lucide-react'

export function ConnectionView() {
  return (
    <main className="grid min-h-screen place-items-center overflow-x-hidden bg-gradient-to-br from-connection-start via-connection-mid to-connection-end px-6 py-10 text-center text-white md:px-10" aria-labelledby="connection-title">
      <section className="flex w-full max-w-md flex-col items-center">
        <header className="flex flex-col items-center">
          <img className="mb-5 h-16 w-auto sm:h-20" src="/branding/logo.svg" alt="" />
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl" id="connection-title">JDR Hub</h1>
          <p className="mt-2 font-body text-base font-medium leading-normal text-primary-fixed">Digital Dungeon Master</p>
        </header>
        <p className="mt-10 max-w-sm font-body text-base leading-relaxed text-violet-100">
          Rejoignez la communauté de rôlistes. Organisez vos parties, trouvez
          des joueurs et vivez vos aventures.
        </p>
        <a className="mt-8 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-discord px-5 py-3.5 font-body text-sm font-bold leading-none text-white shadow-lg shadow-indigo-900/25 transition-colors hover:bg-discord-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-fixed active:translate-y-px motion-reduce:transition-none" href="/api/auth/discord">
          <MessageCircle aria-hidden="true" size={22} strokeWidth={2.25} />
          Continuer avec Discord
        </a>
        <p className="mt-4 flex items-center justify-center gap-2 font-body text-xs leading-normal text-violet-200">
          <ShieldCheck aria-hidden="true" size={17} strokeWidth={2} />
          Connexion sécurisée via Discord
        </p>
        <p className="mt-10 max-w-sm font-body text-xs leading-relaxed text-violet-300">
          Discord sert uniquement à vous identifier. Vous n’avez aucun mot de
          passe à créer.
        </p>
      </section>
    </main>
  )
}
