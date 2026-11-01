import { useNavigate, useLocation } from 'react-router-dom'

// Universal "go back" — always returns to wherever the student
// actually came from (real browser/router history), never a
// hardcoded parent route. `location.key === 'default'` is React
// Router's own signal that this page was the FIRST entry in this
// tab's history (reached via a direct link, bookmark, new tab, or a
// deep link from Search) — there's nothing real to go back to in
// that case, so it falls back to `fallbackPath` instead of doing
// nothing or leaving the app entirely.
export function useGoBack(fallbackPath: string = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  const canGoBack = location.key !== 'default'

  return function goBack() {
    if (canGoBack) navigate(-1)
    else navigate(fallbackPath)
  }
}
