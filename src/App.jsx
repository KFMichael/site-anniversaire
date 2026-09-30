import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { supabaseConfigure } from './lib/supabase'
import AuthProvider from './features/auth/AuthProvider'
import RequiertConnexion from './features/auth/RequiertConnexion'
import Connexion from './features/auth/Connexion'
import EspaceProvider from './features/espace/EspaceProvider'
import RequiertEspace from './features/espace/RequiertEspace'
import Bienvenue from './features/espace/Bienvenue'
import Rejoindre from './features/espace/Rejoindre'
import ReglagesEspace from './features/espace/ReglagesEspace'
import TableauDeBord from './features/tableau-de-bord/TableauDeBord'
import Structure from './components/Structure'
import Chargement from './components/Chargement'
import { BandeauHorsConnexion, LimiteErreur, PageIntrouvable } from './components/Erreurs'
import { useEspace } from './features/espace/contexte'
import CoffreProvider from './features/coffre/CoffreProvider'
import Coffre from './features/coffre/Coffre'
import ChargeMentale from './features/charge/ChargeMentale'
import Courses from './features/courses/Courses'
import Menus from './features/menus/Menus'
import Sport from './features/sport/Sport'
import Echeances from './features/echeances/Echeances'
import Listes from './features/listes/Listes'

// Partie Activités (ex-site anniversaire) chargée à la demande : Leaflet et
// le quiz n'alourdissent pas le premier affichage de l'application.
const Plus = lazy(() => import('./features/plus/Plus'))
const Finances = lazy(() => import('./features/finances/Finances'))
const Equilibre = lazy(() => import('./features/charge/Equilibre'))
const Drive = lazy(() => import('./features/courses/Drive'))
const Activites = lazy(() => import('./features/activites/Activites'))
const Quiz = lazy(() => import('./features/activites/Quiz'))
const CarnetActivites = lazy(() => import('./features/activites/CarnetActivites'))
const CarteVoyages = lazy(() => import('./features/activites/CarteVoyages'))
const MurMessages = lazy(() => import('./features/activites/MurMessages'))
const ModeSurprise = lazy(() => import('./features/activites/ModeSurprise'))
const ReglagesSurprise = lazy(() => import('./features/activites/ReglagesSurprise'))

function AvecEspace() {
  return (
    <EspaceProvider>
      <Outlet />
    </EspaceProvider>
  )
}

// La clé du coffre vit au niveau de l'espace : elle survit à la navigation
// entre onglets, et `key` la jette dès qu'on change d'espace
function AvecCoffre() {
  const { espace } = useEspace()
  return (
    <CoffreProvider key={espace.id}>
      <Outlet />
    </CoffreProvider>
  )
}

function App() {
  if (!supabaseConfigure) {
    return (
      <Chargement
        plein
        texte="Supabase n'est pas configuré : renseigne .env.local (voir README)."
      />
    )
  }

  return (
    <LimiteErreur>
      <AuthProvider>
        <BrowserRouter>
          <BandeauHorsConnexion />
          <Suspense fallback={<Chargement plein />}>
            <Routes>
              <Route path="/connexion" element={<Connexion />} />

              <Route element={<RequiertConnexion />}>
                <Route element={<AvecEspace />}>
                  <Route path="/bienvenue" element={<Bienvenue />} />
                  <Route path="/rejoindre/:code" element={<Rejoindre />} />

                  <Route element={<RequiertEspace />}>
                    <Route element={<AvecCoffre />}>
                      {/* Plein écran, sans barre d'onglets */}
                      <Route path="/surprise" element={<ModeSurprise />} />

                      <Route element={<Structure />}>
                        <Route index element={<TableauDeBord />} />
                        <Route path="/espace" element={<ReglagesEspace />} />
                        <Route path="/charge" element={<ChargeMentale />} />
                        <Route path="/charge/equilibre" element={<Equilibre />} />
                        <Route path="/courses" element={<Courses />} />
                        <Route path="/courses/drive" element={<Drive />} />
                        <Route path="/menus" element={<Menus />} />
                        <Route path="/sport" element={<Sport />} />
                        <Route path="/echeances" element={<Echeances />} />
                        <Route path="/listes" element={<Listes />} />
                        <Route path="/finances" element={<Finances />} />
                        <Route path="/plus" element={<Plus />} />
                        <Route path="/coffre" element={<Coffre />} />
                        <Route path="/activites" element={<Activites />}>
                          <Route index element={<Navigate to="idees" replace />} />
                          <Route path="idees" element={<Quiz />} />
                          <Route path="carnet" element={<CarnetActivites />} />
                          <Route path="voyages" element={<CarteVoyages />} />
                          <Route path="messages" element={<MurMessages />} />
                          <Route path="surprise" element={<ReglagesSurprise />} />
                        </Route>
                      </Route>
                    </Route>
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<PageIntrouvable />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Analytics />
      </AuthProvider>
    </LimiteErreur>
  )
}

export default App
