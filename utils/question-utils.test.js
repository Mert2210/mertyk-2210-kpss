const test = require("node:test");
const assert = require("node:assert/strict");

const {
    fisherYatesShuffle,
    shuffleOptions,
    getFiltersData
} = require("./question-utils");

function withMockedRandom(sequence, callback) {
    const originalRandom = Math.random;
    let index = 0;
    Math.random = () => {
        const value = sequence[index] ?? sequence[sequence.length - 1] ?? 0;
        index += 1;
        return value;
    };

    try {
        callback();
    } finally {
        Math.random = originalRandom;
    }
}

test("fisherYatesShuffle shuffles in place and keeps all elements", () => {
    const items = [1, 2, 3, 4];

    withMockedRandom([0.1, 0.7, 0.3], () => {
        const result = fisherYatesShuffle(items);
        assert.strictEqual(result, items);
        assert.deepStrictEqual(result, [2, 4, 3, 1]);
    });
});

test("shuffleOptions returns input unchanged when question is invalid", () => {
    assert.strictEqual(shuffleOptions(null), null);
    const questionWithoutOptions = { soru: "x" };
    assert.strictEqual(shuffleOptions(questionWithoutOptions), questionWithoutOptions);
});

test("shuffleOptions limits options and preserves correct answer mapping", () => {
    const question = {
        soru: "Örnek soru",
        siklar: ["A", "B", "C", "D", "E", "F"],
        dogru: 2
    };

    withMockedRandom([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2], () => {
        const shuffled = shuffleOptions(question, 4);
        assert.equal(shuffled.siklar.length, 4);
        assert.ok(shuffled.siklar.includes("C"));
        assert.equal(shuffled.siklar[shuffled.dogru], "C");
        assert.equal(new Set(shuffled.siklar).size, 4);
        assert.ok(shuffled.siklar.every((choice) => question.siklar.includes(choice)));
        const wrongChoicesInResult = shuffled.siklar.filter((choice) => choice !== "C");
        assert.equal(wrongChoicesInResult.length, 3);
    });
});

test("shuffleOptions shuffles all options when option count is within max", () => {
    const question = {
        soru: "Diğer soru",
        siklar: ["A", "B", "C", "D"],
        dogru: 0
    };

    withMockedRandom([0.0, 0.0, 0.0], () => {
        const shuffled = shuffleOptions(question, 5);
        assert.deepStrictEqual(shuffled.siklar, ["B", "C", "D", "A"]);
        assert.equal(shuffled.siklar[shuffled.dogru], "A");
    });
});

test("getFiltersData normalizes lessons and counts deneme values", () => {
    const filters = getFiltersData([
        { ders: " tarih ", deneme: "D1" },
        { ders: "TARİH", deneme: "D2" },
        { ders: "", deneme: "D1" },
        { deneme: "D1" },
        { ders: "coğrafya", deneme: "" }
    ]);

    assert.deepStrictEqual(filters.dersler, ["COĞRAFYA", "GENEL", "TARİH"]);
    assert.deepStrictEqual(filters.denemeler, { D1: 3, D2: 1 });
});
