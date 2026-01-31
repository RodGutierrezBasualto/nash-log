# Build Log: Orbital-View

**Date:** 2026-01-31
**Status:** V1.0 - RELEASED

## Concept
A "War Games" / DEFCON style tracker for the International Space Station (ISS).
Goal: To visualize the "physical layer" of the network—the orbital infrastructure that floats above us.

## Tech Stack
-   **Frontend:** HTML5, CSS3, Vanilla JS
-   **Map Engine:** Leaflet.js
-   **Data Source:** Open Notify API (`http://api.open-notify.org/iss-now.json`)
-   **Font:** Share Tech Mono (Google Fonts)

## Features
-   [x] Real-time ISS Lat/Lon telemetry.
-   [x] Leaflet Map with Custom CSS Filters (Grayscale + Sepia + Contrast) for "CRT" look.
-   [x] Custom Scanline and Vignette effects.
-   [x] Auto-updating telemetry panel.
-   [x] Path tracing (last 50 points).

## Aesthetic
-   **Palette:** Amber (#ffb000) on Black.
-   **Vibe:** Industrial, Brutalist, Cold War Control Room.
