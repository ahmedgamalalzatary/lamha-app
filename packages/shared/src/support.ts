// Ratings, complaints, suggestions and contact numbers (contract §8.8, §8.14, §11 الشكاوى والاقتراحات).
import type { Locale } from './format.js';

/** Tawsilty's problem chips for a low rating (customer/orders/rating-one-star-problem-chips-tell-more.jpg). */
export const BAD_TAGS = ['missing_item', 'wrong_order', 'not_hot', 'bad_taste', 'small_quantity', 'bad_packaging'] as const;
/** [Open] The good chips are not captured; the client asked for them (§8.8). */
export const GOOD_TAGS = ['great_taste', 'hot_food', 'fast_delivery', 'good_packaging', 'good_quantity', 'polite_driver'] as const;
export type RatingTag = (typeof BAD_TAGS)[number] | (typeof GOOD_TAGS)[number];
export const RATING_TAGS: readonly RatingTag[] = [...BAD_TAGS, ...GOOD_TAGS];

const TAG_LABELS: Record<RatingTag, Record<Locale, string>> = {
  missing_item: { ar: 'عنصر مفقود', en: 'Missing item' },
  wrong_order: { ar: 'طلب خاطئ', en: 'Wrong order' },
  not_hot: { ar: 'الطعام غير ساخن', en: 'Food not hot' },
  bad_taste: { ar: 'المذاق غير جيد', en: 'Taste not good' },
  small_quantity: { ar: 'الكمية غير كافية', en: 'Not enough' },
  bad_packaging: { ar: 'التغليف غير مناسب', en: 'Poor packaging' },
  great_taste: { ar: 'المذاق رائع', en: 'Great taste' },
  hot_food: { ar: 'الطعام ساخن', en: 'Food was hot' },
  fast_delivery: { ar: 'توصيل سريع', en: 'Fast delivery' },
  good_packaging: { ar: 'تغليف ممتاز', en: 'Great packaging' },
  good_quantity: { ar: 'كمية مناسبة', en: 'Good portion' },
  polite_driver: { ar: 'مندوب محترم', en: 'Polite delivery man' },
};
export const ratingTagLabel = (tag: RatingTag, locale: Locale = 'ar') => TAG_LABELS[tag][locale];

/** 1 to 3 stars asks what went wrong [Owner, 2026-11-25]. */
export const isBadRating = (stars: number) => stars <= 3;
export const ratingTags = (stars: number): readonly RatingTag[] => (isBadRating(stars) ? BAD_TAGS : GOOD_TAGS);

/** The word under the stars: 1 = "مخيبة للآمال" [Tawsilty]; 2 to 5 [Open]. */
const WORDS: Record<Locale, string[]> = {
  ar: ['مخيبة للآمال', 'سيئة', 'مقبولة', 'جيدة', 'ممتازة'],
  en: ['Disappointing', 'Bad', 'Okay', 'Good', 'Excellent'],
};
export const ratingWord = (stars: number, locale: Locale = 'ar') => WORDS[locale][stars - 1] ?? '';

export const RATING_TEXT_LIMIT = 500;

/** POST /v1/me/orders/:id/rating */
export interface RatingInput {
  stars: number;
  tags: RatingTag[];
  /** "أخبرنا المزيد", optional. */
  text: string;
}

/** What is wrong with a rating, or null: "reason" is the red "اختر سبب واحد على الأقل". */
export function ratingProblem(r: RatingInput): 'stars' | 'tags' | 'reason' | 'text' | null {
  if (!Number.isInteger(r.stars) || r.stars < 1 || r.stars > 5) return 'stars';
  const allowed = ratingTags(r.stars);
  if (new Set(r.tags).size !== r.tags.length || r.tags.some((t) => !allowed.includes(t))) return 'tags';
  if (isBadRating(r.stars) && r.tags.length === 0) return 'reason';
  if (r.text.length > RATING_TEXT_LIMIT) return 'text';
  return null;
}

/** A delivered order the app asks the customer to rate, once, when the app opens [Owner]. */
export interface RatePrompt {
  id: number;
  code: string;
  store: { name: string; logo: string | null };
}

export const TICKET_TYPES = ['complaint', 'suggestion'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];
export const TICKET_STATUSES = ['open', 'done'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_TEXT_LIMIT = 1000;

export function ticketProblem(text: string): 'empty' | 'long' | null {
  if (!text.trim()) return 'empty';
  return text.length > TICKET_TEXT_LIMIT ? 'long' : null;
}

/** POST /v1/me/tickets: تقديم مقترح, تقديم شكوى (عامة or about a طلب سابق). */
export interface TicketInput {
  type: TicketType;
  /** A past order of the customer's, for a complaint about it. */
  orderId?: number;
  text: string;
}

/** A row of الشكاوى والاقتراحات: the admin reads it, calls or WhatsApps, and marks it done [Owner]. */
export interface AdminTicket {
  id: number;
  type: TicketType;
  status: TicketStatus;
  text: string;
  customer: { id: number; name: string; phone: string };
  order: { id: number; code: string; store: string } | null;
  createdAt: string;
  doneAt: string | null;
}

/** A rating as the dashboard lists it. */
export interface AdminRating {
  id: number;
  stars: number;
  tags: RatingTag[];
  text: string;
  customer: { id: number; name: string; phone: string };
  order: { id: number; code: string };
  store: { id: number; name: string };
  createdAt: string;
}

/** "تواصل معنا": "هاتف 1" and its number; the admin keeps the list [Owner]. */
export interface SupportPhone {
  label: string;
  phone: string;
}
