// Applies the chosen color mode to the document: the data-theme attribute that switches the CSS variables,
// and the browser theme-color meta tag (the status bar color on mobile).
export function applyTheme(dark) {
  const root = document.documentElement
  root.setAttribute('data-theme', dark ? 'dark' : 'light')
  const color = getComputedStyle(root).getPropertyValue('--page-bg').trim()
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}
