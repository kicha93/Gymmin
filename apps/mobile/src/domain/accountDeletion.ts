export type AccountDeletionLanguage = "en" | "pl";

export function getDeleteAccountConfirmationPhrase(language: AccountDeletionLanguage) {
  return language === "pl" ? "USUŃ" : "DELETE";
}

export function isDeleteAccountConfirmationValid(value: string, language: AccountDeletionLanguage) {
  return value === getDeleteAccountConfirmationPhrase(language);
}
