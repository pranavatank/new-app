# Rojnishi app artwork

- `logo.png` is the transparent notebook artwork used in the app, splash screen, and web favicon.
- `logo_icon.png` is the square app icon configured at the Expo project level.
- `logo_adaptive_foreground.png` is the Android launcher foreground. It uses the transparent notebook artwork centered on a 1024 × 1024 canvas, sized for a rounded-square launcher. Both layers are transparent around the artwork.

If the artwork changes, use the new transparent logo as the foreground source, trim its transparent margins, and fit it inside a 624 × 624 box centered on the 1024 × 1024 canvas. Check a rounded-square mask before building. Launchers that use a circular mask may crop the corners.
