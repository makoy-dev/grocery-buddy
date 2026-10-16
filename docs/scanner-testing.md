# Barcode scanner validation

The scanner uses `expo-camera`'s `CameraView` barcode API and is intentionally offline. Automated tests cover normalization, UPC/EAN equivalence, duplicate-event gating, selected-store price isolation, unknown products, and missing prices.

Before release, validate on a physical Android device with the app offline:

- Grant camera permission and scan EAN-13, EAN-8, UPC-A, and UPC-E packaging under normal and low light.
- Toggle the torch, confirm the visual guide, and verify a successful detection pauses the preview.
- Confirming a priced result adds the selected-store price to the active cart; canceling resumes scanning.
- Deny camera permission, confirm the guidance, and enter a barcode manually.
- Scan the same barcode repeatedly and verify only one lookup occurs until the user resumes.
- Save prices for two stores and verify each scan displays only the selected store's price.

Web and unsupported environments intentionally provide the manual barcode fallback; camera support is not inferred from a browser preview.
