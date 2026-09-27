/**
 * Utilities for WhatsApp and Indonesian phone number normalization & formatting.
 */

/**
 * Normalizes any phone number string into WhatsApp international format without '+' (e.g. 6281234567890).
 * Supports inputs like '0812-3456-7890', '+6281234567890', '+62 818-xxx-yyy', '81234567890', etc.
 * @param {string|null|undefined} raw 
 * @returns {string|null} Normalized phone number string with country code '62', or null if invalid.
 */
export function normalizeWhatsAppNumber(raw) {
  if (!raw || typeof raw !== "string") return null;

  // Strip spaces, dashes, parentheses, dots
  let cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Indonesian format conversions:
  // '08...' -> '628...'
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.slice(1)}`;
  } else if (cleaned.startsWith("8")) {
    // '8...' -> '628...'
    cleaned = `62${cleaned}`;
  }

  // Indonesian mobile numbers are usually between 10 to 15 digits (including 62)
  // Must start with 628 to be a valid Indonesian mobile / WA number
  if (!cleaned.startsWith("628") || cleaned.length < 10 || cleaned.length > 15) {
    // Fallback: If it's another country or valid digit sequence between 10-15 digits
    if (/^\d{10,15}$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  return cleaned;
}

/**
 * Formats a phone number for user-friendly local display (e.g. 0812-3456-7890).
 * @param {string|null|undefined} raw 
 * @returns {string} Formatted phone number or '-'
 */
export function formatPhoneDisplay(raw) {
  const norm = normalizeWhatsAppNumber(raw);
  if (!norm) return raw ? String(raw).trim() : "-";

  let local = norm;
  if (local.startsWith("62")) {
    local = `0${local.slice(2)}`;
  }

  if (local.length >= 10) {
    const p1 = local.slice(0, 4);
    const p2 = local.slice(4, 8);
    const p3 = local.slice(8);
    return `${p1}-${p2}-${p3}`;
  }

  return local;
}

/**
 * Generates direct wa.me link for WhatsApp.
 * @param {string|null|undefined} raw 
 * @param {string} [message=""] Optional pre-filled message text
 * @returns {string|null} 'https://wa.me/628xxx...' or null
 */
export function getWhatsAppLink(raw, message = "") {
  const norm = normalizeWhatsAppNumber(raw);
  if (!norm) return null;

  const base = `https://wa.me/${norm}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}
