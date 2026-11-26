// Pharmacy requests (contract §8.11): a prescription or a product photo, or a written request, sent to
// one pharmacy and paid for at checkout before its price is known.

/** "روشتة طبية" and "صورة المنتج": the two cards of "سهلنا الطلب عليك". */
export const PHARMACY_REQUEST_KINDS = ['prescription', 'product'] as const;
export type PharmacyRequestKind = (typeof PHARMACY_REQUEST_KINDS)[number];

/** "اكتب طلبك" [Derived: Tawsilty's limit is not captured]. */
export const PHARMACY_REQUEST_TEXT_LIMIT = 500;

/** The photo path the API gave back (POST /v1/me/uploads); requests only take photos from there. */
export const REQUEST_IMAGE_PATTERN = /^\/uploads\/requests\/[\w-]+\.jpg$/;

/** What the customer sends: a photo, a text, or both. */
export interface PharmacyRequest {
  kind: PharmacyRequestKind;
  image: string | null;
  text: string;
}

/** A request on a placed order: priced once the pharmacy accepts it with its price. */
export interface OrderRequest extends PharmacyRequest {
  /** False until the pharmacy sets the price: "سيتم إعلامك بسعر الطلب من قبل الصيدلية". */
  priced: boolean;
}

/** "يرجى رفع صورة او كتابة طلبك" until there is a photo or some text. */
export function requestComplete(request: Pick<PharmacyRequest, 'image' | 'text'>): boolean {
  return request.image !== null || request.text.trim().length > 0;
}

/** The most a pharmacy may price a request at [Derived]: matches the API's check. */
export const REQUEST_PRICE_MAX = 100_000;

/**
 * The items price a pharmacy types on "قبول" (§8.11): Latin or Arabic digits, "." or "٫" for the
 * decimals, at most two of them. Null while it is not a price above 0.
 */
export function parseRequestPrice(typed: string): number | null {
  const text = typed.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[٫,]/g, '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const price = Number(text);
  return price > 0 && price <= REQUEST_PRICE_MAX ? price : null;
}
