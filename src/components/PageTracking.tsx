import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { enterPage, initTracking } from '../lib/tracking'

/**
 * Registra automaticamente a página atual (page_view) e encerra a anterior
 * (page_leave com tempo + profundidade de rolagem) a cada navegação SPA.
 * Deve ficar dentro do BrowserRouter.
 */
export function PageTracking() {
  const location = useLocation()

  useEffect(() => {
    initTracking()
    enterPage(location.pathname)
  }, [location.pathname])

  return null
}
