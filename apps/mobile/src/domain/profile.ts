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
  accountAvatar: string;
  accountAvatarNotSet: string;
  accountAvatarSet: string;
  accountAvatarUpdatedAt: string;
  accountEmail: string;
  accountId: string;
  accountCreatedOn: string;
  accountModifiedOn: string;
  accountName: string;
  defaultUserName: string;
};

export type ProfileAccountDetailKey =
  | "name"
  | "email"
  | "accountId"
  | "createdOn"
  | "modifiedOn"
  | "avatar"
  | "avatarUpdatedAt";

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
    },
    {
      key: "modifiedOn",
      label: labels.accountModifiedOn,
      value: user.modifiedOn ? formatDate(user.modifiedOn) : "-"
    },
    {
      key: "avatar",
      label: labels.accountAvatar,
      value: user.avatarUrl ? labels.accountAvatarSet : labels.accountAvatarNotSet
    }
  ];

  if (user.avatarUpdatedAt) {
    details.push({
      key: "avatarUpdatedAt",
      label: labels.accountAvatarUpdatedAt,
      value: formatDate(user.avatarUpdatedAt)
    });
  }

  return details;
}
