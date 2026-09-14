// Simple filter for offensive/inappropriate words — easy to add to or
// remove from right here, no need to touch any other page.
// Note: no filter like this catches 100% of cases — this just blocks the
// obvious, common ones.

const BAD_WORDS = [
  // English
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt',
  'nigger', 'nigga', 'whore', 'slut', 'bastard',
  // Arabic (written in Arabic script and common Latin transliterations)
  'كس', 'طيز', 'زبي', 'شرموط', 'شرموطة', 'عاهر', 'عاهرة', 'قحبه', 'قحبة',
  'منيك', 'خول', 'كسمك', 'ابن الكلب', 'يلعن',
  'zebi', '5awal', 'kosomak', 'sharmota', '2ahba',
]

function normalize(text) {
  return (text || '')
    .toLowerCase()
    // replace common leetspeak digits with letters (0->o, 1->i, 3->e, 4->a, 5->s, 7->t)
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/@/g, 'a')
    // collapse any letter repeated more than twice (e.g. "fuuuuck")
    .replace(/(.)\1{2,}/g, '$1$1')
    // strip whitespace/punctuation so spacing or dots inside a word can't dodge the filter
    .replace(/[\s._\-*]/g, '')
}

export function containsProfanity(text) {
  if (!text || !text.trim()) return false
  const normalized = normalize(text)
  return BAD_WORDS.some(word => normalized.includes(normalize(word)))
}
