import { describe, expect, it } from "vitest";

import {
  buildProfileAccountDetails,
  getProfileDisplayEmail,
  getProfileDisplayName,
  type ProfileAccountLabels
} from "../profile";

const labels: ProfileAccountLabels = {
  accountAvatar: "Avatar",
  accountAvatarNotSet: "Nie ustawiono",
  accountAvatarSet: "Ustawiony",
  accountAvatarUpdatedAt: "Aktualizacja avatara",
  accountCreatedOn: "CreatedOn",
  accountEmail: "Email",
  accountId: "ID konta",
  accountModifiedOn: "ModifiedOn",
  accountName: "Nazwa",
  defaultUserName: "Użytkownik"
};

describe("profile helpers", () => {
  it("uses safe display fallbacks for missing profile data", () => {
    expect(getProfileDisplayName({ name: "  " }, "Profil użytkownika")).toBe("Profil użytkownika");
    expect(getProfileDisplayName({ name: " kicha93 " }, "Profil użytkownika")).toBe("kicha93");
    expect(getProfileDisplayEmail({ email: "  " })).toBe("-");
    expect(getProfileDisplayEmail({ email: " user@example.com " })).toBe("user@example.com");
  });

  it("builds account details from user data without exposing auth token", () => {
    const rows = buildProfileAccountDetails({
      avatarUpdatedAt: "2026-07-05T10:00:00Z",
      avatarUrl: "/api/profile/avatar/user-1",
      createdOn: "2026-07-01T08:00:00Z",
      email: " user@example.com ",
      id: "user-1",
      modifiedOn: "2026-07-05T11:00:00Z",
      name: " User One ",
      token: "secret-auth-token"
    }, labels, (value) => `formatted:${value}`);

    expect(rows).toEqual([
      { key: "name", label: "Nazwa", value: "User One" },
      { key: "email", label: "Email", value: "user@example.com" },
      { key: "accountId", label: "ID konta", value: "user-1" },
      { key: "createdOn", label: "CreatedOn", value: "formatted:2026-07-01T08:00:00Z" },
      { key: "modifiedOn", label: "ModifiedOn", value: "formatted:2026-07-05T11:00:00Z" },
      { key: "avatar", label: "Avatar", value: "Ustawiony" },
      { key: "avatarUpdatedAt", label: "Aktualizacja avatara", value: "formatted:2026-07-05T10:00:00Z" }
    ]);
    expect(JSON.stringify(rows)).not.toContain("secret-auth-token");
  });

  it("uses date fallbacks and does not include avatar update row when avatar timestamp is missing", () => {
    const rows = buildProfileAccountDetails({
      avatarUrl: null,
      email: null,
      id: "user-2",
      name: null
    }, labels, (value) => value);

    expect(rows.map((row) => row.key)).toEqual(["name", "email", "accountId", "createdOn", "modifiedOn", "avatar"]);
    expect(rows.find((row) => row.key === "name")?.value).toBe("Użytkownik");
    expect(rows.find((row) => row.key === "email")?.value).toBe("-");
    expect(rows.find((row) => row.key === "createdOn")?.value).toBe("-");
    expect(rows.find((row) => row.key === "modifiedOn")?.value).toBe("-");
    expect(rows.find((row) => row.key === "avatar")?.value).toBe("Nie ustawiono");
  });
});
