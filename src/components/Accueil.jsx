export default function Accueil({ onEntrer }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center gap-8 text-center px-6">
      <h1 className="text-4xl md:text-6xl font-light tracking-tight text-neutral-900">
        Joyeux anniversaire
      </h1>
      <button
        onClick={onEntrer}
        className="px-8 py-3 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
      >
        Entrer
      </button>
    </section>
  )
}
