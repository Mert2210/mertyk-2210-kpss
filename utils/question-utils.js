function fisherYatesShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function shuffleOptions(q, maxOptions = 5) {
    if (!q || !q.siklar) return q;

    const originalCorrectText = q.siklar[q.dogru];
    let newSiklar = [...q.siklar];

    if (newSiklar.length > maxOptions) {
        const wrongOptions = newSiklar.filter((s, i) => i !== q.dogru);
        fisherYatesShuffle(wrongOptions);
        newSiklar = [originalCorrectText, ...wrongOptions.slice(0, maxOptions - 1)];
    }

    fisherYatesShuffle(newSiklar);
    const newCorrectIndex = newSiklar.indexOf(originalCorrectText);
    return { ...q, siklar: newSiklar, dogru: newCorrectIndex };
}

function getFiltersData(questions = []) {
    const denemeler = {};
    const dersler = [...new Set(
        questions
            .map((q) => (q.ders || "Genel").trim().toLocaleUpperCase("tr"))
            .filter((x) => x)
    )].sort();

    questions.forEach((q) => {
        if (q.deneme) denemeler[q.deneme] = (denemeler[q.deneme] || 0) + 1;
    });

    return { dersler, denemeler };
}

module.exports = {
    fisherYatesShuffle,
    shuffleOptions,
    getFiltersData
};
