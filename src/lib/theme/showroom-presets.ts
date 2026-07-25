import type { ShowroomThemeColors } from "@/types/database";
import { DEFAULT_SHOWROOM_THEME } from "@/lib/constants";

export type ShowroomThemePreset = {
  id: string;
  /** Admin i18n key under settings.theme_presets.* */
  nameKey: string;
  /** Swatch colors for the picker UI */
  swatches: [string, string, string];
  light: ShowroomThemeColors;
  dark: ShowroomThemeColors;
};

export const SHOWROOM_THEME_PRESETS: ShowroomThemePreset[] = [
  {
    id: "nova-olive",
    nameKey: "nova_olive",
    swatches: ["#6b7a3d", "#c9a96e", "#f8f7f2"],
    light: {
      primary: "#6b7a3d",
      primary_hover: "#55622f",
      gold: "#c9a96e",
      background: "#f8f7f2",
      foreground: "#2f2f2f",
      muted: "#666666",
      border: "#e8e5dc",
      card: "#ffffff",
    },
    dark: {
      primary: "#8fa04e",
      primary_hover: "#a3b65c",
      gold: "#d4b87a",
      background: "#1e1f1b",
      foreground: "#f5f5f2",
      muted: "#c9c9c2",
      border: "#4c503f",
      card: "#32352b",
    },
  },
  {
    id: "charcoal-brass",
    nameKey: "charcoal_brass",
    swatches: ["#2c2a26", "#b08d57", "#f3efe6"],
    light: {
      primary: "#2c2a26",
      primary_hover: "#1a1816",
      gold: "#b08d57",
      background: "#f3efe6",
      foreground: "#1c1a17",
      muted: "#6e675c",
      border: "#ddd4c4",
      card: "#fffcf7",
    },
    dark: {
      primary: "#d0c6b4",
      primary_hover: "#e4dccb",
      gold: "#c4a066",
      background: "#141311",
      foreground: "#f2eee6",
      muted: "#a39a8c",
      border: "#3a372f",
      card: "#22201c",
    },
  },
  {
    id: "ink-sand",
    nameKey: "ink_sand",
    swatches: ["#1f2a44", "#c2a27a", "#f6f1ea"],
    light: {
      primary: "#1f2a44",
      primary_hover: "#162033",
      gold: "#c2a27a",
      background: "#f6f1ea",
      foreground: "#1a2233",
      muted: "#667089",
      border: "#e3d9cc",
      card: "#ffffff",
    },
    dark: {
      primary: "#9db0d4",
      primary_hover: "#b8c7e0",
      gold: "#d0b08a",
      background: "#121722",
      foreground: "#eef2f8",
      muted: "#9aa6bd",
      border: "#2c3548",
      card: "#1b2333",
    },
  },
  {
    id: "forest-ember",
    nameKey: "forest_ember",
    swatches: ["#2f5d50", "#c45c26", "#f4f1e8"],
    light: {
      primary: "#2f5d50",
      primary_hover: "#244a40",
      gold: "#c45c26",
      background: "#f4f1e8",
      foreground: "#24302c",
      muted: "#5f6f68",
      border: "#d9d3c4",
      card: "#ffffff",
    },
    dark: {
      primary: "#6fb39f",
      primary_hover: "#86c4b2",
      gold: "#e07a3f",
      background: "#121916",
      foreground: "#eef5f1",
      muted: "#9bb0a7",
      border: "#2c3b34",
      card: "#1a2420",
    },
  },
  {
    id: "slate-copper",
    nameKey: "slate_copper",
    swatches: ["#4a5560", "#b87333", "#f2f4f6"],
    light: {
      primary: "#4a5560",
      primary_hover: "#38424a",
      gold: "#b87333",
      background: "#f2f4f6",
      foreground: "#22272d",
      muted: "#66727d",
      border: "#d5dbe1",
      card: "#ffffff",
    },
    dark: {
      primary: "#a8b4c0",
      primary_hover: "#c0cad4",
      gold: "#d08a4a",
      background: "#15181c",
      foreground: "#eef1f4",
      muted: "#9aa5b0",
      border: "#30363d",
      card: "#1e2328",
    },
  },
  {
    id: "ivory-espresso",
    nameKey: "ivory_espresso",
    swatches: ["#5c4033", "#a67c52", "#faf6f0"],
    light: {
      primary: "#5c4033",
      primary_hover: "#463126",
      gold: "#a67c52",
      background: "#faf6f0",
      foreground: "#2b211c",
      muted: "#7a6a60",
      border: "#e6ddd3",
      card: "#ffffff",
    },
    dark: {
      primary: "#cbb09a",
      primary_hover: "#ddc4b0",
      gold: "#c0925f",
      background: "#171210",
      foreground: "#f6efe8",
      muted: "#b0a095",
      border: "#3a2f29",
      card: "#241c18",
    },
  },
  {
    id: "midnight-champagne",
    nameKey: "midnight_champagne",
    swatches: ["#1b2430", "#d6c29a", "#f7f4ee"],
    light: {
      primary: "#1b2430",
      primary_hover: "#121820",
      gold: "#d6c29a",
      background: "#f7f4ee",
      foreground: "#1a1f27",
      muted: "#6b7380",
      border: "#e2ddd3",
      card: "#ffffff",
    },
    dark: {
      primary: "#c5d0e0",
      primary_hover: "#dae2ee",
      gold: "#e0cdab",
      background: "#0f1319",
      foreground: "#f3f6fb",
      muted: "#a7b0bf",
      border: "#2a3340",
      card: "#171d26",
    },
  },
  {
    id: "ocean-teak",
    nameKey: "ocean_teak",
    swatches: ["#1f5f6b", "#a67c52", "#eef5f6"],
    light: {
      primary: "#1f5f6b",
      primary_hover: "#174851",
      gold: "#a67c52",
      background: "#eef5f6",
      foreground: "#1a2e33",
      muted: "#5b747a",
      border: "#cfe0e3",
      card: "#ffffff",
    },
    dark: {
      primary: "#6db8c6",
      primary_hover: "#88cad5",
      gold: "#c0925f",
      background: "#0f1719",
      foreground: "#eaf5f7",
      muted: "#93adb3",
      border: "#2a3d42",
      card: "#162226",
    },
  },
];

export const DEFAULT_THEME_PRESET_ID = "nova-olive";

export function getShowroomThemePreset(
  presetId: string | null | undefined,
): ShowroomThemePreset {
  return (
    SHOWROOM_THEME_PRESETS.find((p) => p.id === presetId) ??
    SHOWROOM_THEME_PRESETS[0]!
  );
}

export function resolvePresetIdFromColors(
  colors: ShowroomThemeColors | null | undefined,
): string {
  const fromField = (colors as ShowroomThemeColors & { preset_id?: string })
    ?.preset_id;
  if (fromField && SHOWROOM_THEME_PRESETS.some((p) => p.id === fromField)) {
    return fromField;
  }

  if (!colors) return DEFAULT_THEME_PRESET_ID;

  const match = SHOWROOM_THEME_PRESETS.find(
    (p) =>
      p.light.primary.toLowerCase() === colors.primary?.toLowerCase() &&
      p.light.gold.toLowerCase() === colors.gold?.toLowerCase(),
  );
  return match?.id ?? DEFAULT_THEME_PRESET_ID;
}

export function colorsForPreset(
  presetId: string,
  mode: "light" | "dark" = "light",
): ShowroomThemeColors {
  const preset = getShowroomThemePreset(presetId);
  return mode === "dark" ? preset.dark : preset.light;
}

export function themePayloadForPreset(presetId: string): ShowroomThemeColors & {
  preset_id: string;
} {
  const light = colorsForPreset(presetId, "light");
  return { ...light, preset_id: presetId };
}

export function stripPresetMeta(
  colors: ShowroomThemeColors & { preset_id?: string },
): ShowroomThemeColors {
  const { preset_id: _ignored, ...rest } = colors as ShowroomThemeColors & {
    preset_id?: string;
  };
  return {
    ...DEFAULT_SHOWROOM_THEME,
    ...rest,
  };
}
