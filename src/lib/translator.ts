async function translate(text, targetLanguage) {
    const translatedText = await googleTranslate(text, targetLanguage);
    return translatedText;
}

async function googleTranslate(text, targetLanguage) {
    const response = await fetch(`https://translation.api/google?text=${encodeURIComponent(text)}&target=${targetLanguage}`);
    const data = await response.json();

    // Return all available translations
    return data.translations.map(translation => translation.text);
}