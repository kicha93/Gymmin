export const GYMMIN_CONTACT_EMAIL = "kontakt@gymmin.app";

export function buildContactMailUrl(email = GYMMIN_CONTACT_EMAIL): string {
  return `mailto:${email}?subject=${encodeURIComponent("Gymmin - kontakt")}`;
}
