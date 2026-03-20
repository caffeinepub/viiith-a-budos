const BANNED_WORDS = [
  "fuck",
  "f**k",
  "shit",
  "tung tung sahur",
  "tralalero tralala",
  "bombardilo crocodilo",
  "bombombini gusini",
  "italian brainrot",
];

export function containsBannedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
}
