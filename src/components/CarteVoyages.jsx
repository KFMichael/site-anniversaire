import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { voyages } from '../data/voyages'

export default function CarteVoyages() {
  const centreDefaut = [48.8566, 2.3522]

  return (
    <section className="min-h-screen px-6 py-16 bg-bg-base">
      <h2 className="font-sans text-3xl font-semibold text-center text-text-primary mb-8">
        Nos voyages
      </h2>
      <div className="max-w-4xl mx-auto h-[500px] rounded-3xl overflow-hidden shadow-soft">
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
        <p className="font-sans text-center text-text-muted text-sm mt-4">
          Ajoute vos voyages dans src/data/voyages.js
        </p>
      )}
    </section>
  )
}
