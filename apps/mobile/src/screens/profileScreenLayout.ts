export type ProfileScreenLayout = {
  actionsStacked: boolean;
  avatarSize: number;
  compact: boolean;
};

export function getProfileScreenLayout(viewportWidth: number): ProfileScreenLayout {
  if (viewportWidth < 350) {
    return { actionsStacked: true, avatarSize: 104, compact: true };
  }

  if (viewportWidth < 400) {
    return { actionsStacked: false, avatarSize: 112, compact: true };
  }

  return { actionsStacked: false, avatarSize: 132, compact: false };
}
