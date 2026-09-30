import { createContext, useContext } from 'react'

// Messages temporaires (voir Messages.jsx) : annoncer(texte, { annuler })
export const MessagesContexte = createContext({ annoncer: () => {} })

export function useMessages() {
  return useContext(MessagesContexte)
}
