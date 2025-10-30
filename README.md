# Lore Spoilers

This SillyTavern extension hides World Info (Lorebook) entries from your UI to prevent spoilers, while the LLM always receives the original, unobfuscated plaintext.

Perfect for scenarios where you want the AI to know about future plot twists, secret character knowledge, or story branches without spoiling them for yourself.

## Features

- **Spoiler Hiding**: Automatically ciphers and hides the content of any World Info entry that starts with a specific tag (e.g., `[SPOILER]`)
- **Caesar Cipher**: Uses a classic Caesar cipher to obfuscate text in the UI (configurable shift 1-25)
- **Configurable Tag**: Set your own spoiler tag
- **Click to Reveal**: Click into a hidden entry to instantly reveal the original plaintext for editing
- **LLM Sees All**: The LLM always receives the original, unobfuscated plaintext for full context
- **Simple UI**: One-click button to hide all spoilers when you're done editing

## Installation

1. Open SillyTavern
2. Go to Extensions → Install Extension
3. Paste this repository URL: `https://github.com/your-username/lore-spoilers`
4. Click Install
5. Refresh the page

## Usage

1. Navigate to the Extensions panel, then click Extension Settings (cog icon)
2. Find "Lore Spoilers" in the right-hand (UI) column
3. Enable the "Enable Lore Spoilers" checkbox
4. (Optional) Configure your preferred Spoiler Tag and Caesar Cipher Shift
5. Go to the World Info panel (book icon)
6. Create a new entry or edit an existing one
7. In the "Content" textarea, add your spoiler tag to the very beginning (e.g., `[SPOILER]Vader is Luke's father`)
8. Click the "🔒 Hide All Spoilers Now" button in Extension Settings
9. The content will be replaced with ciphered text in your UI
10. Click back into the textarea anytime to reveal and edit
11. The LLM always receives the plaintext version automatically!

## How It Works

This extension only ciphers what you see in the UI. The World Info database always stores plaintext, so when SillyTavern sends context to the LLM, it automatically includes the unobfuscated spoilers.

## Requirements

- SillyTavern 1.12.0 or higher

## Configuration

- **Spoiler Tag**: The tag that marks entries as spoilers (default: `[SPOILER]`)
- **Caesar Cipher Shift**: Number of positions to shift letters (default: 13 / ROT13)

## License

MIT
