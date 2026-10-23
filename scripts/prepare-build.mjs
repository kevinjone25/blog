import { rm } from 'node:fs/promises'

// Regenerate Astro's derived content state so removing the final post also
// produces a truly empty site. No article source or public asset is removed.
await rm(new URL('../.astro/', import.meta.url), { recursive: true, force: true })
await rm(new URL('../node_modules/.astro/data-store.json', import.meta.url), { force: true })
