document.addEventListener('DOMContentLoaded', () => {
    const langJaBtn = document.getElementById('lang-ja');
    const langEnBtn = document.getElementById('lang-en');

    let translations = {};

    // Load translations from JSON
    fetch('translations.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            translations = data;
            // Set initial language to English
            loadLanguage('en');
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
        });

    // Function to update text content based on selected language
    const loadLanguage = (lang) => {
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.dataset.i18nKey;
            if (translations[lang] && translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        document.documentElement.lang = lang; // Update the lang attribute of the <html> tag
    };

    // Event listeners for language buttons
    langJaBtn.addEventListener('click', () => loadLanguage('ja'));
    langEnBtn.addEventListener('click', () => loadLanguage('en'));
});