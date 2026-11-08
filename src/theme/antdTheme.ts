import type { ThemeConfig } from "antd";

const color = (role: string) => `var(--md-sys-color-${role})`;
const state = (role: string, opacity: string) =>
  `color-mix(in srgb, ${color(role)} var(--md-sys-state-${opacity}-opacity), transparent)`;

/** Presentation only. CSS owns light/dark palettes; no business state lives here. */
export const md3Theme: ThemeConfig = {
  cssVar: { key: "md3" },
  token: {
    fontFamily: "var(--md-sys-typescale-font-family)",
    fontFamilyCode: "var(--md-sys-typescale-code-font-family)",
    fontSize: 14, borderRadius: 12, controlHeight: 56,
    colorPrimary: color("primary"), colorPrimaryHover: color("primary"), colorPrimaryActive: color("primary"),
    colorPrimaryBg: color("primary-container"), colorPrimaryBgHover: color("primary-container"),
    colorPrimaryBorder: color("outline"), colorPrimaryBorderHover: color("primary"),
    colorPrimaryText: color("primary"), colorPrimaryTextHover: color("primary"), colorPrimaryTextActive: color("primary"),
    colorLink: color("primary"), colorLinkHover: color("primary"), colorLinkActive: color("primary"),
    colorText: color("on-surface"), colorTextHeading: color("on-surface"),
    colorTextSecondary: color("on-surface-variant"), colorTextTertiary: color("on-surface-variant"),
    colorTextQuaternary: color("on-surface-variant"), colorTextPlaceholder: color("on-surface-variant"),
    colorTextLightSolid: color("on-primary"),
    colorTextDisabled: `color-mix(in srgb, ${color("on-surface")} var(--md-sys-state-disabled-opacity), transparent)`,
    colorBgLayout: color("surface"), colorBgContainer: color("surface-container-low"),
    colorBgElevated: color("surface-variant"), colorBgContainerDisabled: color("surface-container-highest"),
    colorBorder: color("outline"), colorBorderSecondary: color("outline-variant"),
    colorFill: color("surface-container-highest"), colorFillSecondary: color("surface-container-high"),
    colorFillTertiary: color("surface-container"), colorFillQuaternary: color("surface-container-low"),
    controlItemBgHover: state("on-surface", "hover"), controlItemBgActive: color("secondary-container"),
    controlItemBgActiveHover: color("secondary-container"), controlOutline: state("primary", "focus"),
    colorSuccess: color("success"), colorSuccessBg: color("success-container"), colorSuccessBorder: color("success"),
    colorSuccessText: color("on-success-container"),
    colorWarning: color("warning"), colorWarningBg: color("warning-container"), colorWarningBorder: color("warning"),
    colorWarningText: color("on-warning-container"),
    colorError: color("error"), colorErrorHover: color("error"), colorErrorActive: color("error"),
    colorErrorBg: color("error-container"), colorErrorBorder: color("error"), colorErrorText: color("error"),
    colorInfo: color("info"), colorInfoBg: color("info-container"), colorInfoBorder: color("info"), colorInfoText: color("on-info-container"),
    colorBgSpotlight: color("inverse-surface"), colorWhite: color("on-primary"),
    colorBgMask: `color-mix(in srgb, ${color("scrim")} 32%, transparent)`,
    boxShadow: "none", boxShadowSecondary: "none", boxShadowTertiary: "none",
  },
  components: {
    Button: { controlHeight: 40, controlHeightLG: 40, controlHeightSM: 40, borderRadius: 9999, fontWeight: 500, paddingInline: 24, primaryShadow: "none", defaultShadow: "none", dangerShadow: "none", primaryColor: color("on-primary") },
    Card: { borderRadiusLG: 12, colorBgContainer: color("surface-container") },
    Menu: { itemHeight: 56, itemBorderRadius: 9999, itemSelectedBg: color("secondary-container"), itemSelectedColor: color("on-secondary-container"), itemColor: color("on-surface-variant"), itemBg: "transparent", itemHoverBg: state("on-surface", "hover") },
    Input: { activeShadow: "none", errorActiveShadow: "none", warningActiveShadow: "none" },
    InputNumber: { activeShadow: "none", errorActiveShadow: "none", warningActiveShadow: "none" },
    Select: { optionSelectedBg: color("secondary-container"), optionSelectedColor: color("on-secondary-container"), activeOutlineColor: "transparent" },
    Table: { colorBgContainer: color("surface-container"), headerBg: color("surface-container-highest"), headerColor: color("on-surface-variant"), rowSelectedBg: color("secondary-container"), rowSelectedHoverBg: color("secondary-container"), rowHoverBg: state("on-surface", "hover"), borderColor: color("outline-variant") },
    Modal: { borderRadiusLG: 28, contentBg: color("surface-variant"), headerBg: color("surface-variant") },
    Drawer: { colorBgElevated: color("surface-container-low") },
    Tooltip: { colorBgSpotlight: color("inverse-surface"), colorTextLightSolid: color("inverse-on-surface") },
  },
};
