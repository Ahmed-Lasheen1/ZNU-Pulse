// Shared timing for the Home entrance (Home, header, footer), in seconds.

// Pause before anything starts moving.
export const ENTRANCE_PAUSE = 0.75

// Header entrance.
export const LOGO_DELAY = ENTRANCE_PAUSE + 0.5
export const BRAND_WORDS_START = LOGO_DELAY + 0.45
export const BRAND_WORD_STAGGER = 0.2
export const BRAND_TAGLINE_DELAY = BRAND_WORDS_START + BRAND_WORD_STAGGER * 2 + 0.2

// When the Footer may start its own entrance on Home. Must come after Home's last
// reveal (~4.55s); bump it if Home's timeline in Home.tsx changes.
export const HOME_ENTRANCE_END = 4.6
