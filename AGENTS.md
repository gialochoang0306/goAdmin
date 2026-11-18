# AGENTS.md — GoAdmin Engineering & Design Guardrails

## 1. Mandatory Product & Design Context
- Before modifying any UI, route, form, table, or style in `F:\goAdmin`, read [PRODUCT.md](file:///F:/goAdmin/PRODUCT.md) and [DESIGN.md](file:///F:/goAdmin/DESIGN.md).
- Preserve Ant Design 6 (`src/theme/antdTheme.ts` via `ConfigProvider` `cssVar: { key: "md3" }`) and Material Design 3 semantic tokens (`src/theme/theme.css`). Do not layer a custom design system on top of Ant Design or hardcode raw hex/rgb colors outside `src/theme/theme.css`.

## 2. Typography, Spacing & Surface Rules
- Follow the documented type ramp (`28px`, `24px`, `22px`, `18px`, `16px`, `15px`, `14px`, `13px`, `12px`, `11px`) and corner tokens (`--md-sys-shape-corner-*`: `4px`, `8px`, `12px`, `16px`, `28px`, `9999px`) in [DESIGN.md](file:///F:/goAdmin/DESIGN.md).
- Keep surfaces flat and tonal (`boxShadow: "none"`). Never nest default bordered cards inside panels/cards; use flat tonal sub-blocks (`.document-card`, `.rating-item`, `.verification-decision-box`) with `--md-sys-color-outline-variant`.
- Align financial/numeric table columns right with `.ant-table-cell-align-right` (`tabular-nums`) and format currency/dates through `money()`, `date()`, and `dateFilter()` in [src/lib/format.ts](file:///F:/goAdmin/src/lib/format.ts).
- Keep list filter bars (`.filters` + `<FilterField>`) outside the table `<Panel>`, with a single `"Xóa bộ lọc"` action.

## 3. Light/Dark & Responsive Requirements
- Verify every layout change across both Light and Dark themes (`[data-theme="dark"]` tokens in `src/theme/theme.css` and `antdTheme.ts`), ensuring semantic containers and ink tokens stay accessible.
- Ensure zero horizontal page overflow (`overflow-x`) from `375px` mobile (Drawer sidebar + `<DataTable>` mobile cards) up through `1280×720`, `1440×900`, and `1920×1080` desktop (fitting 9 sidebar items without vertical scroll at `1280×720`), plus `200%` browser zoom on `/login`.

## 4. Security, Privacy & Backend Contracts
- Never expose PII, eKYC verification image URLs (CCCD, GPLX, selfie must stay behind authenticated `verificationFetch(..., { binary: true })`), Firebase secrets, or private keys in source, logs, URLs, or committed screenshots.
- Never bypass Firebase Authentication, admin role verification (`/api/admin/auth/me`), or backend identity-lock rules.
- Preserve Spring Boot backend API contracts (`F:\datxebackend`, `integration/backend-release`): handle all server enum values (`RideStatus` including `FAILED_SYSTEM`), keep destructive/financial actions (`Duyệt`/`Từ chối`, `Hủy chuyến`, `Thu hồi`, `Dừng chiến dịch`) protected with confirmation, mandatory reasons, and `isPending` double-submit/modal-close guards.

## 5. Impeccable Verification & Pre-Commit Gate
- After significant UI or token changes, run the Impeccable audit checks (`impeccable doctor`, `impeccable context`, `impeccable detect --json src`) and confirm `.impeccable/design.json` stays in sync with [DESIGN.md](file:///F:/goAdmin/DESIGN.md).
- Before creating any commit, run and observe passing results for:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
- Do not skip tests, weaken assertions, or increase global test timeouts to mask root-cause test issues.

