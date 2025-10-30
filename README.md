Lore Spoilers

This SillyTavern extension hides World Info (Lorebook) entries from the user's UI to prevent spoilers, while still sending the original, un-hidden plaintext to the LLM.

It's perfect for scenarios where you want the AI to know about future plot twists, secret character knowledge, or story branches without spoiling them for yourself.

Features

Spoiler Hiding: Automatically ciphers and hides the content of any World Info entry that starts with a specific tag (e.g., [SPOILER]).

Caesar Cipher: Uses a classic Caesar cipher to obfuscate the text in the UI.

Configurable: You can set your own spoiler tag and adjust the cipher shift (1-25).

Click to Reveal: Simply click (focus) on a hidden entry to instantly reveal the original plaintext for editing.

Hides on Blur: The entry automatically re-hides when you click away (blur).

LLM Sees All: The LLM always receives the original, un-hidden plaintext for full context.

Installation

Open SillyTavern.

Go to the Extensions panel (top-right, looks like stacked blocks).

Click Install Extension.

Paste this repository URL: https://github.com/your-username/lore-spoilers (replace your-username with your actual GitHub username).

Click Install.

Wait for the installation to complete and then Reload the UI.

Usage

Navigate to the Extensions panel, then click the Extension Settings cog icon.

Find "Lore Spoilers" in the right-hand (UI) column.

Ensure the "Enable Lore Spoilers" checkbox is ticked.

(Optional) Configure your preferred Spoiler Tag and Caesar Cipher Shift.

Go to the World Info panel (book icon).

Create a new entry or edit an existing one.

In the "Content" textarea, add your spoiler tag to the very beginning of the text (e.g., [SPOILER]).

Write your secret, spoiler-filled lore directly after the tag. (e.g., [SPOILER]Vader is Luke's father.).

Click out of the textarea. The content will instantly be replaced with a hidden, ciphered version.

Click back into the textarea at any time to reveal the original text and make edits.

Prerequisites

SillyTavern 1.12.0 or higher (due to the extensions system).
