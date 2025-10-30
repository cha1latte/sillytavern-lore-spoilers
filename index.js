// Import from SillyTavern core
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension configuration
const extensionName = "lore-spoilers";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {
    enabled: true,
    shift: 13, // Default to ROT13
    tag: "[SPOILER]"
};

// --- Caesar Cipher Logic ---
/**
 * Ciphers text using a Caesar cipher with a given shift.
 * Handles wrapping for both uppercase and lowercase letters.
 * @param {string} str - The text to cipher.
 * @param {number} shift - The shift value (1-25).
 * @returns {string} The ciphered text.
 */
function caesarCipher(str, shift) {
    // Normalize shift to be within 0-25
    shift = ((Number(shift) % 26) + 26) % 26;
    if (shift === 0) return str;

    return str.replace(/[a-zA-Z]/g, (char) => {
        const charCode = char.charCodeAt(0);
        let base;

        if (charCode >= 65 && charCode <= 90) { // Uppercase
            base = 65;
        } else if (charCode >= 97 && charCode <= 122) { // Lowercase
            base = 97;
        } else {
            return char; // Not a letter
        }

        let newCode = ((charCode - base + shift) % 26) + base;
        return String.fromCharCode(newCode);
    });
}

// --- Core Extension Logic ---

let lorebookObserver = null;

/**
 * Hides the content of a lorebook textarea if it has the spoiler tag.
 * @param {HTMLTextAreaElement} textarea - The lorebook content textarea.
 */
function hideSpoiler(textarea) {
    try {
        const settings = extension_settings[extensionName];
        if (!settings.enabled) return;

        const tag = settings.tag.trim();
        const content = textarea.value;

        // Check if it has the tag AND is not already hidden
        if (content.startsWith(tag) && !textarea.dataset.loreSpoilerOriginal) {
            // Store the original text
            textarea.dataset.loreSpoilerOriginal = content;

            // Get text *after* the tag
            const cleanContent = content.substring(tag.length);
            const cipheredContent = caesarCipher(cleanContent, settings.shift);

            // Update the UI
            textarea.value = `${tag} (SPOILER HIDDEN - Click to reveal)\n---\n${cipheredContent}`;
            textarea.classList.add('lore-spoiler-hidden');
        }
    } catch (error) {
        console.error(`[${extensionName}] Error hiding spoiler:`, error);
    }
}

/**
 * Reveals the original plaintext content of a lorebook textarea.
 * @param {HTMLTextAreaElement} textarea - The lorebook content textarea.
 */
function revealSpoiler(textarea) {
    try {
        if (textarea.dataset.loreSpoilerOriginal) {
            textarea.value = textarea.dataset.loreSpoilerOriginal;
            textarea.classList.remove('lore-spoiler-hidden');
            // We delete the 'original' data so it can be re-hidden on blur
            delete textarea.dataset.loreSpoilerOriginal;
        }
    } catch (error) {
        console.error(`[${extensionName}] Error revealing spoiler:`, error);
    }
}

/**
 * Processes a single lore entry textarea, adding event listeners.
 * @param {HTMLTextAreaElement} textarea - The lorebook content textarea.
 */
function processLoreEntry(textarea) {
    if (textarea.dataset.loreSpoilerProcessed) return; // Already processed

    // Add focus/blur listeners
    textarea.addEventListener('focus', () => {
        if (!extension_settings[extensionName].enabled) return;
        revealSpoiler(textarea);
    });

    textarea.addEventListener('blur', () => {
        if (!extension_settings[extensionName].enabled) return;
        // Re-hide on blur
        hideSpoiler(textarea);
    });

    // Hide it initially
    hideSpoiler(textarea);

    textarea.dataset.loreSpoilerProcessed = 'true';
}

/**
 * Scans the lorebook panel for new entries and processes them.
 * @param {Node} targetNode - The DOM node to scan.
 */
function scanAndProcessEntries(targetNode) {
    if (!extension_settings[extensionName].enabled) {
        // If disabled, reveal all
        targetNode.querySelectorAll('textarea.loreEntryTextarea').forEach(revealSpoiler);
        return;
    }

    // Find all lorebook textareas (selector based on SillyTavern's code)
    const textareas = targetNode.querySelectorAll('textarea.loreEntryTextarea');
    textareas.forEach(processLoreEntry);
}

/**
 * Starts the MutationObserver to watch for lorebook entries.
 */
function startObserver() {
    const targetNode = document.getElementById('lorebook_panel');
    if (!targetNode) {
        console.warn(`[${extensionName}] Lorebook panel not found. Observer not started.`);
        return;
    }

    if (lorebookObserver) lorebookObserver.disconnect();

    lorebookObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Is an element
                        // Check if the node itself is a textarea or contains one
                        if (node.matches && node.matches('textarea.loreEntryTextarea')) {
                            processLoreEntry(node);
                        } else if (node.querySelectorAll) {
                            scanAndProcessEntries(node);
                        }
                    }
                });
            }
        }
    });

    lorebookObserver.observe(targetNode, { childList: true, subtree: true });

    // Initial scan for entries already present
    scanAndProcessEntries(targetNode);
    console.log(`[${extensionName}] Observer started on #lorebook_panel.`);
}

/**
 * Stops the MutationObserver.
 */
function stopObserver() {
    if (lorebookObserver) {
        lorebookObserver.disconnect();
        lorebookObserver = null;
        // Reveal any remaining hidden entries
        document.querySelectorAll('textarea.loreEntryTextarea').forEach(revealSpoiler);
        console.log(`[${extensionName}] Observer stopped.`);
    }
}

// --- Settings Load/Save ---

async function loadSettings() {
    Object.assign(
        extension_settings[extensionName],
        defaultSettings,
        await loadExtensionSettings(extensionName)
    );

    const settings = extension_settings[extensionName];
    $("#lore_spoilers_enabled").prop("checked", settings.enabled);
    $("#lore_spoilers_shift").val(settings.shift);
    $("#lore_spoilers_shift_value").text(settings.shift);
    $("#lore_spoilers_tag").val(settings.tag);

    if (settings.enabled) {
        startObserver();
    } else {
        stopObserver();
    }
}

// Event handler for settings checkbox
function onEnabledInput(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].enabled = value;
    saveSettingsDebounced();

    if (value) {
        startObserver();
    } else {
        stopObserver();
    }
}

// Event handler for slider
function onShiftInput(event) {
    const value = Number($(event.target).val());
    $("#lore_spoilers_shift_value").text(value);
    extension_settings[extensionName].shift = value;
    saveSettingsDebounced();
    // Re-scan and apply new shift (revealing all first)
    document.querySelectorAll('textarea.loreEntryTextarea').forEach(revealSpoiler);
    scanAndProcessEntries(document.getElementById('lorebook_panel'));
}

// Event handler for tag input
function onTagInput(event) {
    const value = $(event.target).val();
    extension_settings[extensionName].tag = value;
    saveSettingsDebounced();
    // Re-scan and apply new tag (revealing all first)
    document.querySelectorAll('textarea.loreEntryTextarea').forEach(revealSpoiler);
    scanAndProcessEntries(document.getElementById('lorebook_panel'));
}

// Extension initialization
jQuery(async () => {
    // Load HTML settings from file
    const settingsHtml = await $.get(`${extensionFolderPath}/lore-spoilers.html`);

    // Append to the UI extensions column
    $("#extensions_settings2").append(settingsHtml);

    // Bind event listeners
    $("#lore_spoilers_enabled").on("input", onEnabledInput);
    $("#lore_spoilers_shift").on("input", onShiftInput);
    $("#lore_spoilers_tag").on("input", onTagInput);

    // Load saved settings
    loadSettings();

    console.log(`[${extensionName}] Loaded successfully.`);
});
