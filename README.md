# ∂v/∂t

Five-page typographic journey. Mouse/touch moves continuously toward the pointer; keyboard arrows and WASD also work.

Print uses 37.5 logical pixels, 1.5 times the previous version, with reflowed short text islands and a two-line opening equation. Glyphs have individual collision rectangles and a two-pixel typesetting gap.

Movement projects letter contacts immediately, including letter-to-letter and letter-to-character separation. Unresolved contacts roll back the proposed movement and retry smaller steps; ink cannot be overtaken by the player. Spring return and final-page inertia use the same constraints. The final vortex transforms the characters and letters together.

Stokes wakes near the first right margin. Both characters reach the margin to turn each page; circling on the last page builds the final vortex. The afterword uses the same paper canvas.

Validation: JavaScript syntax; five initial layouts and 800 simulated pushing/restoration frames with no intersecting collision rectangles. This is a logic check, not a browser screenshot or device performance test.
