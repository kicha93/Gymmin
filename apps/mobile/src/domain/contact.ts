export const GYMMIN_CONTACT_EMAIL = "kontakt@gymmin.app";

export function buildContactMailUrl(language: "en" | "pl", email = GYMMIN_CONTACT_EMAIL): string {
  const subject = language === "pl" ? "Gymmin - kontakt" : "Gymmin - contact";
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
