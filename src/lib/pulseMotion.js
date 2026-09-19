// Shared timing constants for the ZNU Pulse Home redesign's entrance
// animations (Home.jsx + PulseCard.jsx) — a short pause before
// anything starts moving, so the page reads as "here, then revealing"
// rather than everything popping in the instant React mounts. Kept in
// one place so every animated element on Home stays in sync if this
// value is ever tuned.
export const ENTRANCE_PAUSE = 0.75

// When the site-wide Footer (components/Footer.jsx) is allowed to play
// its own entrance on Home. Must stay AFTER the last piece of Home's
// cascade: Home's closing "Keep the pulse" line starts at
// TOOLS_START + 0.8 (= 3.85s) and takes 0.7s, so it finishes at ~4.55s.
// If Home's timeline in Home.tsx ever changes, bump this to match.
export const HOME_ENTRANCE_END = 4.6
