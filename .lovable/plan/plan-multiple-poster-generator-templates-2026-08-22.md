# Plan - Multiple Poster Generator Templates

Add support for multiple visual templates in the Post Generator to offer more professional variety.

## User Review Required

> [!IMPORTANT]
> I will implement two initial templates: the current "Modern Smartphone" style and a new "Cinematic Banner" style. Should I add more styles now, or start with these?

- **Current Template (Smartphone)**: A vertical phone frame showing the poster and metadata.
- **New Template (Cinematic)**: A horizontal banner style with a wide background and floating details.

## Proposed Changes

### UI & UX
- Add a "Template" selection tab in the controls panel.
- Implement visual previews for each template in the selection grid.
- Update the main preview area to render different components based on the selected template.

### Components
- Create `src/components/duplicados/templates/SmartphoneTemplate.tsx` (extracted from current logic).
- Create `src/components/duplicados/templates/CinematicTemplate.tsx` (new wide layout).

### State Management
- Add `selectedTemplate` state to `GeradorPost.tsx`.
- Pass all customization props (colors, logo, content) to the active template component.

## Technical Details

- Use a `switch` statement in `GeradorPost.tsx` to toggle between template components.
- Standardize the prop interface for all templates to ensure consistency.
- Ensure `html-to-image` works correctly across different aspect ratios.
