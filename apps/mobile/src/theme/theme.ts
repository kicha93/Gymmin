export const themes = {
  light: {
    background: "#f7f4ec",
    border: "#ded6c5",
    card: "#fffdf8",
    control: "#fffaf1",
    danger: "#b82b48",
    inputText: "#191d1b",
    muted: "#695f53",
    primary: "#0f7c7a",
    primaryStrong: "#14302f",
    secondaryBand: "#e7dcc6",
    selectedOption: "#d2d2d2",
    segment: "#eee6d8",
    statusBar: "dark" as const,
    switchTrack: "#d8cab3",
    text: "#191d1b",
    white: "#ffffff"
  },
  dark: {
    background: "#111717",
    border: "#2d3b3a",
    card: "#182221",
    control: "#111b1a",
    danger: "#ff6f8b",
    inputText: "#f4f1e8",
    muted: "#a9b4ad",
    primary: "#25b7a8",
    primaryStrong: "#07100f",
    secondaryBand: "#223735",
    selectedOption: "#34403f",
    segment: "#24302f",
    statusBar: "light" as const,
    switchTrack: "#2f4542",
    text: "#f4f1e8",
    white: "#ffffff"
  }
};

export type ThemeName = keyof typeof themes;

export type Theme = (typeof themes)[ThemeName];
