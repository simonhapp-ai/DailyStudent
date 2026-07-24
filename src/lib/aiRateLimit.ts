// Bucket identifiers for the server-side AI abuse ceiling (see migration
// 012_ai_rate_limits.sql + api/groq.ts + api/gemini.ts). The actual per-bucket limits are
// defined server-side only (in the edge functions) so a client can't spoof a higher ceiling —
// this type just keeps the client-side bucket names in sync with what the server recognizes.
export type AiBucket =
  | 'smart_notes'
  | 'flashcards'
  | 'blurting'
  | 'keyword_qa'
  | 'lernzettel'
  | 'lernzettel_visuals'
  | 'probeklausur_full'
  | 'probeklausur_other'
  | 'lernplan'
