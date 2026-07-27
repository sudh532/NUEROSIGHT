document.addEventListener('DOMContentLoaded', () => {
    // 1. Retrieve stored preferences or fall back to defaults
    const savedTheme = localStorage.getItem('neurosight_theme') || 'tokyo-night';
    const savedFont = localStorage.getItem('neurosight_font') || 'jetbrains';

    applyTheme(savedTheme);
    applyFont(savedFont);

    // 2. Event Listeners for Theme Switching
    const themeButtons = document.querySelectorAll('#theme-picker .picker-option-btn, .theme-radio-card');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const themeId = btn.dataset.themeId || (btn.querySelector('input') && btn.querySelector('input').value);
            if (themeId) applyTheme(themeId);
        });
    });

    // 3. Event Listeners for Font Switching
    const fontButtons = document.querySelectorAll('#font-picker .picker-option-btn');
    fontButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const fontId = btn.dataset.fontId;
            if (fontId) applyFont(fontId);
        });
    });

    // 4. Bind Segmented & Picker Groups and Top Navigation Tabs
    bindSegmentedControls();
    bindNavTabs();
});

/**
 * Universal Button Group Activator
 * Strips .is-active and .active from sibling buttons before setting active on clicked element
 */
function bindSegmentedControls() {
    document.querySelectorAll('.segmented-group, .picker-group, .segmented-control, .sensitivity-pill-group, .picker-grid').forEach(group => {
        const buttons = group.querySelectorAll('button, .picker-option-btn, .segmented-btn, .segment-btn, .sensitivity-pill-btn, .theme-radio-card');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => {
                    b.classList.remove('is-active');
                    b.classList.remove('active');
                });
                btn.classList.add('is-active');
                btn.classList.add('active');
            });
        });
    });
}

/**
 * Top Navigation Tab State Controller
 * Strips .is-active and .active from siblings before setting active on clicked tab
 */
function bindNavTabs() {
    document.querySelectorAll('.nav-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab-btn').forEach(t => {
                t.classList.remove('is-active');
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('is-active');
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
        });
    });
}

function applyTheme(themeId) {
    console.log("Applying Global Theme:", themeId);
    
    // Set data-theme attribute on <html> and <body> elements so all child CSS variables update
    document.documentElement.setAttribute('data-theme', themeId);
    if (document.body) document.body.setAttribute('data-theme', themeId);
    localStorage.setItem('neurosight_theme', themeId);

    // Update active button state in settings drawer
    document.querySelectorAll('#theme-picker .picker-option-btn, [data-theme-id], .theme-radio-card').forEach(btn => {
        const tId = btn.dataset.themeId || (btn.querySelector('input') && btn.querySelector('input').value);
        if (tId === themeId) {
            btn.classList.add('is-active', 'active');
            const radio = btn.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        } else {
            btn.classList.remove('is-active', 'active');
            const radio = btn.querySelector('input[type="radio"]');
            if (radio) radio.checked = false;
        }
    });
}

function applyFont(fontId) {
    console.log("Applying Global Font:", fontId);
    
    // Set data-font attribute on <html> and <body> elements
    document.documentElement.setAttribute('data-font', fontId);
    if (document.body) document.body.setAttribute('data-font', fontId);
    localStorage.setItem('neurosight_font', fontId);

    // Update active button state in settings drawer
    document.querySelectorAll('#font-picker .picker-option-btn, [data-font-id]').forEach(btn => {
        if (btn.dataset.fontId === fontId) {
            btn.classList.add('is-active', 'active');
        } else {
            btn.classList.remove('is-active', 'active');
        }
    });
}

// Global Exports
window.applyTheme = applyTheme;
window.applyFont = applyFont;
window.bindSegmentedControls = bindSegmentedControls;
window.bindNavTabs = bindNavTabs;
