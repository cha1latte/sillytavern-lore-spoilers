# Lore Spoilers

This SillyTavern extension hides World Info (Lorebook) entries from the user's UI to prevent spoilers, while still sending the original, un-hidden plaintext to the LLM.

**⚠️ Currently in Stage 1 Testing - Basic Structure Only**

## Installation

1. Open SillyTavern
2. Go to Extensions → Install Extension
3. Paste the GitHub URL for this repository
4. Click Install
5. Refresh the page

## Testing Stage 1

After installation:

1. Open Extensions settings (top-right icon)
2. Click Extension Settings (cog icon)
3. Look for "Lore Spoilers" in the right panel
4. The drawer should appear with a success message
5. Open browser console (F12) and look for `[lore-spoilers] ✅ Loaded successfully`

## What's Next

Once Stage 1 is confirmed working, we'll add:
- Settings to enable/disable the extension
- Configuration for spoiler tags
- Caesar cipher shift setting
- The actual spoiler hiding functionality

## Current Status

✅ Stage 1: Basic drawer appears in Extensions settings
✅ Stage 2: Add basic settings (enable checkbox)
✅ Stage 3: Add configuration options (spoiler tag & cipher shift)
✅ Stage 4: Implement spoiler detection
✅ Stage 5: Implement Caesar cipher
✅ Stage 6: Implement click-to-reveal in World Info
⏳ Stage 7: Implement LLM plaintext sending (final step)
