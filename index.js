// Import from SillyTavern core
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// Extension name MUST match folder name
const extensionName = "lore-spoilers";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Default settings
const defaultSettings = {
    enabled: false,
    spoilerTag: "[SPOILER]",
    cipherShift: 13
};

// Store original (plaintext) values - maps entry UID to plaintext
const displayCipheredEntries = new Map();

// Load saved settings
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
    $("#lore_spoilers_enabled").prop("checked", extension_settings[extensionName].enabled);
    $("#lore_spoilers_tag").val(extension_settings[extensionName].spoilerTag);
    $("#lore_spoilers_shift").val(extension_settings[extensionName].cipherShift);
}

// Handle enable checkbox change
function onEnabledChange(event) {
    const value = Boolean($(event.target).prop("checked"));
    extension_settings[extensionName].enabled = value;
    saveSettingsDebounced();
}

// Handle spoiler tag change
function onSpoilerTagChange(event) {
    const value = String($(event.target).val());
    extension_settings[extensionName].spoilerTag = value;
    saveSettingsDebounced();
}

// Handle cipher shift change
function onCipherShiftChange(event) {
    let value = parseInt($(event.target).val());
    if (isNaN(value) || value < 1) value = 1;
    if (value > 25) value = 25;
    extension_settings[extensionName].cipherShift = value;
    $("#lore_spoilers_shift").val(value);
    saveSettingsDebounced();
}

// Caesar cipher function
function caesarCipher(text, shift) {
    return text.split('').map(char => {
        if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0);
            const isUpperCase = (code >= 65 && code <= 90);
            const base = isUpperCase ? 65 : 97;
            return String.fromCharCode(((code - base + shift) % 26) + base);
        }
        return char;
    }).join('');
}

// Handle clicking "Cipher Entire Lorebook" button  
async function onCipherAllClick() {
    console.log('[lore-spoilers] onCipherAllClick called');
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    try {
        const context = getContext();
        const shift = extension_settings[extensionName].cipherShift;
        
        // Get the currently selected world info name from the dropdown
        const worldInfoSelect = document.querySelector('#world_info');
        if (!worldInfoSelect) {
            toastr.warning("Could not find World Info selector.", "Lore Spoilers");
            return;
        }
        
        const selectedOptions = Array.from(worldInfoSelect.selectedOptions);
        if (selectedOptions.length === 0) {
            toastr.warning("No lorebook is currently selected.", "Lore Spoilers");
            return;
        }
        
        const lorebookName = selectedOptions[0].value;
        console.log(`[lore-spoilers] Selected lorebook: ${lorebookName}`);
        
        if (!lorebookName) {
            toastr.warning("Could not determine lorebook name.", "Lore Spoilers");
            return;
        }
        
        // Load the world info data using SillyTavern's API
        const worldInfoData = await context.loadWorldInfo(lorebookName);
        
        if (!worldInfoData || !worldInfoData.entries) {
            toastr.warning("Could not load lorebook data.", "Lore Spoilers");
            console.error('[lore-spoilers] worldInfoData:', worldInfoData);
            return;
        }
        
        console.log(`[lore-spoilers] Loaded ${worldInfoData.entries.length} entries from ${lorebookName}`);
        
        let cipheredCount = 0;
        
        // Cipher ALL entries
        worldInfoData.entries.forEach((entry, idx) => {
            if (!entry.content || !entry.content.trim()) {
                console.log(`[lore-spoilers] Entry ${idx}: Empty, skipping`);
                return;
            }
            
            const originalContent = entry.content;
            const ciphered = caesarCipher(originalContent, shift);
            
            console.log(`[lore-spoilers] Entry ${idx} (uid=${entry.uid}): Ciphering ${originalContent.length} chars`);
            
            // Store plaintext for restoration
            displayCipheredEntries.set(entry.uid, {
                plaintext: originalContent,
                ciphered: ciphered,
                lorebookName: lorebookName
            });
            
            // Modify content
            entry.content = ciphered;
            
            // Update visible textarea if exists
            const textarea = document.querySelector(`textarea[id="world_entry_content_${entry.uid}"]`);
            if (textarea) {
                textarea.value = ciphered;
            }
            
            cipheredCount++;
        });
        
        // Save the modified lorebook using SillyTavern's API
        await context.saveWorldInfo(lorebookName, worldInfoData);
        
        console.log(`[lore-spoilers] Saved ${cipheredCount} ciphered entries to ${lorebookName}`);
        
        if (cipheredCount > 0) {
            toastr.success(`Ciphered ${cipheredCount} ${cipheredCount === 1 ? 'entry' : 'entries'} (all entries, including collapsed)`, "Lore Spoilers");
        } else {
            toastr.info("No entries with content found", "Lore Spoilers");
        }
        
    } catch (error) {
        console.error('[lore-spoilers] Error:', error);
        toastr.error(`Failed to cipher: ${error.message}`, "Lore Spoilers");
    }
}
        
        console.log(`[lore-spoilers] Found ${worldInfo.entries.length} entries in lorebook`);
        
        let cipheredCount = 0;
        
        // Cipher ALL entries
        worldInfo.entries.forEach((entry, idx) => {
            if (!entry.content || !entry.content.trim()) {
                console.log(`[lore-spoilers] Entry ${idx}: Empty, skipping`);
                return;
            }
            
            const originalContent = entry.content;
            const ciphered = caesarCipher(originalContent, shift);
            
            console.log(`[lore-spoilers] Entry ${idx} (uid=${entry.uid}): Ciphering ${originalContent.length} chars`);
            
            // Store plaintext for restoration
            displayCipheredEntries.set(entry.uid, {
                plaintext: originalContent,
                ciphered: ciphered
            });
            
            // Modify content in the data structure
            entry.content = ciphered;
            
            // Update visible textarea if exists
            const textarea = document.querySelector(`textarea[id="world_entry_content_${entry.uid}"]`);
            if (textarea) {
                textarea.value = ciphered;
            }
            
            cipheredCount++;
        });
        
        // Save the lorebook
        await context.saveWorldInfo(worldInfo.name, true);
        
        console.log(`[lore-spoilers] Ciphered and saved ${cipheredCount} entries`);
        
        if (cipheredCount > 0) {
            toastr.success(`Ciphered ${cipheredCount} ${cipheredCount === 1 ? 'entry' : 'entries'} (all entries, including collapsed)`, "Lore Spoilers");
        } else {
            toastr.info("No entries with content found", "Lore Spoilers");
        }
        
    } catch (error) {
        console.error('[lore-spoilers] Error:', error);
        toastr.error(`Failed to cipher: ${error.message}`, "Lore Spoilers");
    }
}

// Handle clicking "Reveal Entire Lorebook" button
async function onRevealAllClick() {
    console.log('[lore-spoilers] onRevealAllClick called');
    
    if (!extension_settings[extensionName].enabled) {
        toastr.warning("Extension is disabled", "Lore Spoilers");
        return;
    }
    
    try {
        const context = getContext();
        
        // Get the currently selected world info
        const worldInfoSelect = document.querySelector('#world_info');
        if (!worldInfoSelect) {
            toastr.warning("Could not find World Info selector.", "Lore Spoilers");
            return;
        }
        
        const selectedOptions = Array.from(worldInfoSelect.selectedOptions);
        if (selectedOptions.length === 0) {
            toastr.warning("No lorebook is currently selected.", "Lore Spoilers");
            return;
        }
        
        const lorebookName = selectedOptions[0].value;
        console.log(`[lore-spoilers] Selected lorebook: ${lorebookName}`);
        
        // Load the world info data
        const worldInfoData = await context.loadWorldInfo(lorebookName);
        
        if (!worldInfoData || !worldInfoData.entries) {
            toastr.warning("Could not load lorebook data.", "Lore Spoilers");
            return;
        }
        
        let revealedCount = 0;
        
        // Restore plaintext for all ciphered entries
        worldInfoData.entries.forEach((entry, idx) => {
            if (displayCipheredEntries.has(entry.uid)) {
                const data = displayCipheredEntries.get(entry.uid);
                
                console.log(`[lore-spoilers] Entry ${idx} (uid=${entry.uid}): Restoring plaintext`);
                
                // Restore content
                entry.content = data.plaintext;
                
                // Update visible textarea if exists
                const textarea = document.querySelector(`textarea[id="world_entry_content_${entry.uid}"]`);
                if (textarea) {
                    textarea.value = data.plaintext;
                }
                
                revealedCount++;
            }
        });
        
        // Save the restored lorebook
        if (revealedCount > 0) {
            await context.saveWorldInfo(lorebookName, worldInfoData);
            displayCipheredEntries.clear();
        }
        
        console.log(`[lore-spoilers] Revealed and saved ${revealedCount} entries`);
        
        if (revealedCount > 0) {
            toastr.success(`Revealed ${revealedCount} ${revealedCount === 1 ? 'entry' : 'entries'}`, "Lore Spoilers");
        } else {
            toastr.info("No ciphered entries to reveal", "Lore Spoilers");
        }
        
    } catch (error) {
        console.error('[lore-spoilers] Error:', error);
        toastr.error(`Failed to reveal: ${error.message}`, "Lore Spoilers");
    }
}

// Inject cipher/reveal buttons into lorebook UI
function injectLorebookButtons() {
    if (!extension_settings[extensionName].enabled) {
        return;
    }
    
    const selectors = ['#world_popup_new_entry', '#world_popup_entries_list', '.world_popup', '#world_info'];
    
    let lorebookContainer = null;
    for (const selector of selectors) {
        lorebookContainer = document.querySelector(selector);
        if (lorebookContainer) break;
    }
    
    if (!lorebookContainer || lorebookContainer.querySelector('.lore-spoiler-lorebook-btns')) {
        return;
    }
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'lore-spoiler-lorebook-btns';
    buttonContainer.style.cssText = 'margin: 10px 0; padding: 10px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px;';
    buttonContainer.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="button" class="menu_button menu_button_icon lore-cipher-lorebook-btn" 
                   value="🔒 Cipher This Lorebook" 
                   title="Hide ALL entries (including collapsed)" />
            <input type="button" class="menu_button menu_button_icon lore-reveal-lorebook-btn" 
                   value="👁️ Reveal This Lorebook" 
                   title="Show all entries"
                   style="display: none;" />
        </div>
    `;
    
    if (lorebookContainer.firstChild) {
        lorebookContainer.insertBefore(buttonContainer, lorebookContainer.firstChild);
    } else {
        lorebookContainer.appendChild(buttonContainer);
    }
    
    const cipherBtn = buttonContainer.querySelector('.lore-cipher-lorebook-btn');
    const revealBtn = buttonContainer.querySelector('.lore-reveal-lorebook-btn');
    
    cipherBtn.addEventListener('click', async () => {
        await onCipherAllClick();
        cipherBtn.style.display = 'none';
        revealBtn.style.display = 'inline-block';
    });
    
    revealBtn.addEventListener('click', async () => {
        await onRevealAllClick();
        cipherBtn.style.display = 'inline-block';
        revealBtn.style.display = 'none';
    });
}

// Setup monitoring for UI changes
function setupWorldInfoMonitoring() {
    const observer = new MutationObserver(() => {
        injectLorebookButtons();
    });
    
    const containers = ['#world_info', '#world_popup', 'body'];
    
    for (const selector of containers) {
        const container = document.querySelector(selector);
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true
            });
            break;
        }
    }
    
    injectLorebookButtons();
    
    setInterval(() => {
        injectLorebookButtons();
    }, 2000);
}

// Extension initialization
jQuery(async () => {
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);
        $("#extensions_settings2").append(settingsHtml);
        
        $("#lore_spoilers_enabled").on("input", onEnabledChange);
        $("#lore_spoilers_tag").on("input", onSpoilerTagChange);
        $("#lore_spoilers_shift").on("input", onCipherShiftChange);
        
        loadSettings();
        setupWorldInfoMonitoring();
        
        console.log(`[${extensionName}] Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});
