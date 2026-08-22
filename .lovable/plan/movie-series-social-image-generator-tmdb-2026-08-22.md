---
title: "Movie/Series Social Image Generator (TMDB)"
description: "Implementation of a social image generator for movies and series using TMDB API with customization options like user logo and synopsis."
---

# Movie/Series Social Image Generator (TMDB)

We will implement a tool that allows users to generate promotional images for movies and series. The system will fetch data from TMDB (image, synopsis, title, genres, year) and combine it into a customizable layout, including the user's logo.

## Proposed Changes

### 1. New Page: Social Image Generator
- **Location**: `src/pages/GeradorPost.tsx` (or similar name).
- **Functionality**: 
  - Search bar to find movies/series via TMDB API.
  - Preview area showing the generated image (using HTML/CSS or Canvas).
  - Customization options: Logo upload, accent colors, status labels (e.g., "LANÇAMENTOS", "FILME EM DESTAQUE").
  - Export functionality to download the generated image.

### 2. Navigation
- **File**: `src/components/user/UserSidebar.tsx`.
- **Change**: Add a new menu item "Gerador de Posts" immediately after "Loja".

### 3. Backend / State
- **API**: Use the existing TMDB API key configured in the user's settings.
- **Storage**: Allow users to save their preferred logo in `localStorage` or profile settings for reuse.

### 4. Layout
- Replicate the design provided in the reference image:
  - Background: Blurred poster image.
  - Center: Phone/Tablet frame with the main poster.
  - Top: Customizable labels and User Logo.
  - Bottom: Title, Stars, Metadata (Genre, Year), and Synopsis.
  - Footer: "Disponível em" with device icons.

## Technical Details

- **TMDB Integration**: Reuse `src/services/TmdbService.ts` for fetching metadata.
- **Image Generation**: Use `html-to-image` or `dom-to-image` to convert the React component preview into a downloadable file.
- **UI Components**: Shadcn/ui (Cards, Inputs, Buttons, Dialogs).
- **Logo Handling**: Support for uploading a custom PNG/SVG logo with transparency.

### Route Registration
- **File**: `src/App.tsx`.
- Add `/gerador-post` route under `SimpleProtectedRoute`.
