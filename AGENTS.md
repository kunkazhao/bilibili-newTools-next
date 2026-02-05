## Project Instructions

### ai-params-by-category behavior (project-wide)
- Always call the model first (use the backend AI flow) to get real parameters.
- Use preset fields from the category (`spec_fields`) only; never add new fields.
- Show a preview (old -> new) and wait for explicit confirmation before writing.
- Default: fill empty only. Do not overwrite non-empty values unless user says "force overwrite".
- If the model call fails, do not fabricate values; report the error and stop.

**Recommended API flow**
1) `POST /api/sourcing/items/ai-fill` (get model results)
2) Show preview + ask for confirmation
3) `POST /api/sourcing/items/ai-confirm` (write)
