import { useEffect, useRef } from 'react'
import { BORD, gesteReussi, sensDuGeste } from './geste-retour'

// Appli ouverte depuis l'écran d'accueil (pas d'onglet Safari, donc pas de
// geste retour natif). Dans Safari, on laisse le geste du navigateur.
function modeApplication() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// Glisser depuis le bord gauche : la page suit le doigt, puis `revenir()`
// si le geste est assez long (sinon la page reprend sa place)
export function useGesteRetour(pageRef, revenir) {
  const rappel = useRef(revenir)
  useEffect(() => {
    rappel.current = revenir
  })
  const actif = Boolean(revenir)

  useEffect(() => {
    if (!actif || !modeApplication()) return
    let geste = null

    const placer = (dx, animer) => {
      const page = pageRef.current
      if (!page) return
      page.style.transition = animer ? 'transform 200ms ease-out' : 'none'
      page.style.transform = dx ? `translateX(${dx}px)` : ''
    }

    function debut(e) {
      const t = e.touches[0]
      geste = e.touches.length === 1 && t.clientX <= BORD ? { x: t.clientX, y: t.clientY, dx: 0, sens: null } : null
    }
    function mouvement(e) {
      if (!geste) return
      const t = e.touches[0]
      const dx = t.clientX - geste.x
      geste.sens ??= sensDuGeste(dx, t.clientY - geste.y)
      if (geste.sens === 'vertical') {
        geste = null
        return
      }
      if (geste.sens === 'horizontal') {
        geste.dx = Math.max(0, dx)
        placer(geste.dx, false)
      }
    }
    function fin() {
      if (!geste) return
      const reussi = geste.sens === 'horizontal' && gesteReussi(geste.dx, window.innerWidth)
      geste = null
      if (!reussi) {
        placer(0, true)
        return
      }
      placer(window.innerWidth, true)
      setTimeout(() => {
        rappel.current?.()
        requestAnimationFrame(() => placer(0, false))
      }, 180)
    }

    document.addEventListener('touchstart', debut, { passive: true })
    document.addEventListener('touchmove', mouvement, { passive: true })
    document.addEventListener('touchend', fin)
    document.addEventListener('touchcancel', fin)
    return () => {
      document.removeEventListener('touchstart', debut)
      document.removeEventListener('touchmove', mouvement)
      document.removeEventListener('touchend', fin)
      document.removeEventListener('touchcancel', fin)
      placer(0, false)
    }
  }, [actif, pageRef])
}
