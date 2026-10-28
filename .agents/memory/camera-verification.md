---
name: Camera verification boundaries
description: Limits of screenshot-only camera checks and automated browser camera validation.
---

Camera verification must distinguish an idle screenshot, an interactive test with a synthetic video stream, and physical-device validation. Do not describe these as equivalent.

**Why:** Idle-only verification missed a camera startup failure. The automated browser also lacked WebGL while the user's preview reported working WebGL, so its inference failure was not evidence that camera capture itself was broken.

**How to apply:** Verify camera activation interactively before claiming success. Label synthetic-feed results explicitly, and report missing browser graphics support separately from permission or capture failures.
