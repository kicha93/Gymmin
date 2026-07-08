export type ProfileAccountUser = {
  avatarUpdatedAt?: string | null;
  avatarUrl?: string | null;
  createdOn?: string | null;
  email?: string | null;
  id: string;
  modifiedOn?: string | null;
  name?: string | null;
  token?: string;
};

export type ProfileAccountLabels = {
  accountEmail: string;
  accountId: string;
  accountCreatedOn: string;
  accountName: string;
  defaultUserName: string;
};

export type ProfileAccountDetailKey =
  | "name"
  | "email"
  | "accountId"
  | "createdOn";

export type ProfileAccountDetail = {
  key: ProfileAccountDetailKey;
  label: string;
  value: string;
};

export function getProfileDisplayName(user: Pick<ProfileAccountUser, "name">, fallback: string) {
  return user.name?.trim() || fallback;
}

export function getProfileDisplayEmail(user: Pick<ProfileAccountUser, "email">) {
  return user.email?.trim() || "-";
}

export function buildProfileAccountDetails(
  user: ProfileAccountUser,
  labels: ProfileAccountLabels,
  formatDate: (value: string) => string
): ProfileAccountDetail[] {
  const details: ProfileAccountDetail[] = [
    {
      key: "name",
      label: labels.accountName,
      value: getProfileDisplayName(user, labels.defaultUserName)
    },
    {
      key: "email",
      label: labels.accountEmail,
      value: getProfileDisplayEmail(user)
    },
    {
      key: "accountId",
      label: labels.accountId,
      value: user.id
    },
    {
      key: "createdOn",
      label: labels.accountCreatedOn,
      value: user.createdOn ? formatDate(user.createdOn) : "-"
    }
  ];

  return details;
}
