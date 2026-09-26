export default function Chargement({ plein = false, texte = 'Chargement…' }) {
  return (
    <div
      className={`flex items-center justify-center bg-bg-base ${plein ? 'min-h-screen' : 'py-16'}`}
    >
      <p className="font-sans text-sm text-text-muted">{texte}</p>
    </div>
  )
}
