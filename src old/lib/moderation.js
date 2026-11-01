// Long, unambiguous terms match anywhere; short ones only as whole words
// so real names (خولة, زبيدة, أليكس, Nikos, Dickson) aren't blocked.
// Keep in sync with public.is_inappropriate_text in the database.
const SUBSTRING_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'pussy', 'cunt',
  'nigger', 'nigga', 'whore', 'slut', 'bastard',
  'طيز', 'شرموط', 'شرموطة', 'قحبه', 'قحبة', 'كسمك', 'ابن الكلب',
  'kosomak', 'sharmota', '2ahba',
]

const WHOLE_WORDS = [
  'dick', 'kos', 'zebi', '5awal',
  'كس', 'زبي', 'عاهر', 'عاهرة', 'منيك', 'خول', 'يلعن',
]

function leet(text) {
  return text
    .toLowerCase()
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/(.)\1{2,}/g, '$1$1')
}

const squash = (text) => leet(text).replace(/[\s._\-*]/g, '')

const BLOCKED_SUBSTRINGS = SUBSTRING_WORDS.map(squash)
const BLOCKED_WORDS = new Set(WHOLE_WORDS.map(leet))

export function containsProfanity(text) {
  if (!text || !text.trim()) return false
  const squashed = squash(text)
  if (BLOCKED_SUBSTRINGS.some(word => squashed.includes(word))) return true
  return text
    .toLowerCase()
    .split(/[\s._*,;:!?()+/-]+/)
    .some(token => token && BLOCKED_WORDS.has(leet(token)))
}
