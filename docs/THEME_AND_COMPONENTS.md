# Shared theme and UI components

All screens, including the daily book, use `useTheme()` from `src/store/ThemeContext.js`. The palettes live in `src/constants/theme.js`; light/dark settings and text scaling apply throughout the app. Do not create a screen-specific palette or override the context colors.

Use semantic color tokens from `C` and sizes from `scaleTheme(scale)`. Add a missing color role to both central palettes rather than placing a hex/RGB value in a screen. `npm run check:source` rejects literal UI colors in screens, components and App.js.

Reuse the public components exported by `src/components/common/index.js` for surfaces, buttons, inputs, sheets, section headers, empty states and navigation rows. Extend those components when a reusable behavior is missing. Screen styles should describe the arrangement of content; shared components own repeated controls and their appearance.

Keep English and Gujarati labels together in the locale dictionaries. Allow labels to wrap at narrow widths and increased text size. Amounts and dates use Latin digits in both languages.

The shared `DayOverview` supplies the selected-day module previews to Today and the original Home. Changes to those previews should be made in the shared component so the two views stay consistent.

Before handing off a UI change, run the source check and the relevant data regression checks. An Expo export verifies bundling; it does not verify touch targets, Gujarati wrapping or keyboard behavior on a physical phone.
