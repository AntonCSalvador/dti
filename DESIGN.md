# Wardrobe Studio interface

The app is a task workspace used beside Roblox. A left column holds the theme, styling, body compatibility, optional reference, and search action. The right column switches between reference looks and the searchable free wardrobe. A selected look pairs its photo with the manual checklist.

## Visual system

- Light neutral surfaces keep catalog images legible against varied photographic backgrounds.
- Plum (`#704363`) identifies actions and selection; ink (`#29232e`) and muted text (`#6c6372`) carry hierarchy.
- Manrope with a system fallback, compact field labels, and a larger welcome heading.
- Borders separate work areas; item thumbnails remain contained so garment shapes are visible.
- At narrow widths, the theme form precedes results. The catalog uses two columns and the checklist stacks below its reference.

## States and interaction

Form values survive errors and cancellation. Loading is explicit, requests can be canceled, and stale requests cannot overwrite newer state. Checklist changes are local and reset when switching looks. Keyboard focus, skip navigation, reduced motion, and status/error announcements are supported.

Catalog and reference images retain their source links. Generated visual previews are not used as evidence that an outfit can be assembled.
