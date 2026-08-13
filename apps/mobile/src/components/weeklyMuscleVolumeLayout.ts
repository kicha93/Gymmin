export type WeeklyMuscleVolumeLayout = {
  anatomyHeight: number;
  anatomyWidth: number;
  controlsStacked: boolean;
  rowMetaStacked: boolean;
};

export function getWeeklyMuscleVolumeLayout(windowWidth: number): WeeklyMuscleVolumeLayout {
  if (windowWidth < 340) {
    return { anatomyHeight: 292, anatomyWidth: 122, controlsStacked: true, rowMetaStacked: true };
  }
  if (windowWidth < 390) {
    return { anatomyHeight: 322, anatomyWidth: 138, controlsStacked: false, rowMetaStacked: true };
  }
  return { anatomyHeight: 350, anatomyWidth: 154, controlsStacked: false, rowMetaStacked: false };
}

export function toggleWeeklyMuscleGroup<T>(hiddenGroups: ReadonlySet<T>, group: T): Set<T> {
  const next = new Set(hiddenGroups);
  if (next.has(group)) next.delete(group);
  else next.add(group);
  return next;
}
