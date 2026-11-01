// Shared "is this a success or error message" check — InlineMessage,
// AuthPrimitives' AuthMessage, Profile's inline EditProfileForm
// banner, and AnonQuestions each independently re-implemented this
// exact one-line check. Centralized here; each banner keeps its own
// padding/layout — only the boolean now comes from one place.
export function isSuccessMessage(message) {
  return !!message && message.includes('✅')
}
