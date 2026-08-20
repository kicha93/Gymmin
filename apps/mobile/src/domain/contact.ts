export const GYMMIN_CONTACT_EMAIL = "kontakt@gymmin.app";

export function buildContactMailUrl(
  language: "en" | "pl",
  email = GYMMIN_CONTACT_EMAIL,
  body?: string
): string {
  const subject = language === "pl" ? "Gymmin - kontakt" : "Gymmin - contact";
  const bodyQuery = body ? `&body=${encodeURIComponent(body)}` : "";
  return `mailto:${email}?subject=${encodeURIComponent(subject)}${bodyQuery}`;
}
