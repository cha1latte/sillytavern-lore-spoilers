# Lore Spoilers

A SillyTavern extension that automatically hides World Info (Lorebook) entries from your view to prevent spoilers, while the LLM always receives the original, unobfuscated plaintext.

Perfect for when you want to generate AI content about future plot twists, secret character knowledge, or story branches without spoiling them for yourself.

## Features

- **🔒 One-Click Spoiler Prevention**: Click one button to hide all lorebook entries
- **Automatic Expansion**: Expands all entries automatically while keeping content blurred
- **No Spoilers Seen**: Content is blurred during expansion so you never see plaintext
- **Caesar Cipher (ROT13)**: Uses a simple cipher to obfuscate text in the UI
- **LLM Sees All**: The LLM always receives the original, unobfuscated plaintext for full context
- **Pagination Handling**: Automatically shows all entries (up to 1000) before ciphering
- **Simple UI**: Just two buttons - Cipher and Reveal

## Installation

1. Open SillyTavern
2. Go to **Extensions → Install Extension**
3. Paste this repository URL: `https://github.com/your-username/lore-spoilers`
4. Click **Install**
5. Refresh the page

## Usage

### Quick Start

1. Open SillyTavern and navigate to **Extensions** settings
2. Enable "Lore Spoilers" in the UI extensions panel
3. Open a lorebook in **World Info** (book icon)
4. Click **"🔒 Expand & Cipher All"** at the top of the lorebook
5. Done! All entries are now hidden from you

### How It Works

When you click "Expand & Cipher All":

1. **Blur Filter Applied**: All content is immediately blurred so you can't read it
2. **Pagination Set**: Automatically shows all entries (up to 1000 per page)
3. **Auto-Expansion**: All collapsed entries are programmatically expanded
4. **Ciphering**: Each entry's content is replaced with ROT13 ciphered text
5. **Blur Removed**: Blur is removed, revealing only the ciphered (unreadable) text

**You never see the plaintext!**

### Revealing Entries

Click **"👁️ Reveal All"** to restore all entries to their original plaintext.

## Important Notes

### LLM Access

The LLM **always** receives the original plaintext. The ciphering only affects what you see in the UI. When SillyTavern sends context to the LLM, it automatically includes the unciphered content from the database.

### Saving

The extension automatically ensures plaintext is saved to the database, not ciphered text. You can safely:
- Save the lorebook
- Close entries
- Switch between lorebooks
- Refresh the page

The plaintext is always preserved.

### Character Limit

The extension handles up to 1000 entries per lorebook. If you have more than 1000 entries, you'll need to manually set the pagination higher before ciphering.

## Use Cases

- **Story Writing**: Generate 50 AI plot twists and cipher them so you can use them later without spoiling yourself
- **RPG Campaigns**: Hide secret character backgrounds, plot reveals, or future story beats
- **Interactive Fiction**: Keep branching paths hidden until players discover them
- **World Building**: Store spoiler-heavy lore without accidentally reading it

## Technical Details

- **Cipher**: ROT13 (Caesar cipher with shift of 13)
- **Storage**: Plaintext always stored in database
- **UI Only**: Ciphering only affects the browser display
- **Save Hook**: Intercepts save operations to ensure plaintext is preserved

## Requirements

- SillyTavern 1.12.0 or higher

## Troubleshooting

### "No expanded entries found"
Make sure a lorebook is open in the World Info panel before clicking the button.

### Entries still visible after ciphering
Refresh the page and try again. Make sure the extension is enabled in settings.

### Some entries not ciphered
The extension processes up to 1000 entries. If you have more, manually set pagination higher first.

## Configuration

The extension has minimal configuration:

- **Enable/Disable**: Toggle the extension on/off
- **Cipher**: Fixed at ROT13 (shift of 13)

## License

MIT

## Support

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify the extension is enabled in settings
3. Make sure you're using SillyTavern 1.12.0 or higher
4. Try refreshing the page

## Credits

Created for SillyTavern users who want to generate spoiler-heavy content without spoiling themselves.
