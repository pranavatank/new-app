# Shared theme and UI components

All screens and React Navigation use `useTheme()` from `src/store/ThemeContext.js`. Light and dark colors, gradients, text roles, and shared layout values live in `src/constants/theme.js`.

Use semantic color tokens from `C`, scaled type, spacing and radii from `scaleTheme(scale)`, and shared content width and touch targets from `Layout`. Static style defaults can use the base typography export. Add each color role to both palettes. `npm run check:source` checks palette parity, literal UI colors and typography, registered routes, and bilingual navigation labels.

Reuse the public components exported by `src/components/common/index.js` for surfaces, buttons, inputs, sheets, headers, empty states and navigation rows. Give icon-only buttons a translated action label. Screen styles describe the arrangement of content. Shared components own repeated controls and their appearance.

Keep English and Gujarati labels together in the locale dictionaries. Allow labels to wrap at narrow widths and increased text size. Amounts and dates use Latin digits in both languages.

The shared `DayOverview` supplies the selected-day module previews to Today and the original Home. Changes to those previews should be made in the shared component so the two views stay consistent.

The rounded tab bar reserves its own space inside the navigator and accounts for the bottom safe area. Add secondary destinations to the grouped Tools menu and register each screen in `App.js`. Today and Month book share ledger rows, and Month book opens the selected day's details in Today.

Before handing off a UI change, run the source check and the relevant data regression checks. An Expo export verifies bundling; it does not verify touch targets, Gujarati wrapping or keyboard behavior on a physical phone.
