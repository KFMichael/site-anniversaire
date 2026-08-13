import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { voyages } from '../data/voyages'

export default function CarteVoyages() {
  // Centre par défaut sur Paris ; à ajuster une fois les voyages ajoutés
  const centreDefaut = [48.8566, 2.3522]

  return (
    <section className="min-h-screen px-6 py-16">
      <h2 className="text-2xl font-light text-center text-neutral-900 mb-8">
        Nos voyages
      </h2>
      <div className="max-w-4xl mx-auto h-[500px] rounded-xl overflow-hidden border border-neutral-200">
        <MapContainer
          center={centreDefaut}
          zoom={4}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {voyages.map((v) => (
            <Marker key={v.id} position={[v.latitude, v.longitude]}>
              <Popup>
                <strong>{v.lieu}</strong>
                <br />
                {v.anecdote}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {voyages.length === 0 && (
        <p className="text-center text-neutral-400 text-sm mt-4">
          Ajoute vos voyages dans src/data/voyages.js
        </p>
      )}
    </section>
  )
}
