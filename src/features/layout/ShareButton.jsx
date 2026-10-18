import { useToast } from '../../hooks/useToast'
import { Share } from '../../components/Icons'

/** Copies the current (or given) URL — every stock and view is shareable. */
export function ShareButton({ url, label = 'Share', className = '' }) {
  const toast = useToast()
  const share = async () => {
    const href = url || window.location.href
    try {
      if (navigator.share) { await navigator.share({ url: href, title: document.title }); return }
      await navigator.clipboard.writeText(href); toast('Link copied')
    } catch { /* user cancelled */ }
  }
  return <button type="button" onClick={share} className={`btn btn-secondary ${className}`}><Share size={20} />{label}</button>
}
