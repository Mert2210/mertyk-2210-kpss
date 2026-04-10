const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateEarnedPoints, calculateNextReviewDate } = require("./game-rules");

test("calculateEarnedPoints gives max bonus for fast answers", () => {
    assert.equal(calculateEarnedPoints(0), 20);
    assert.equal(calculateEarnedPoints(1), 20);
});

test("calculateEarnedPoints never goes below base score", () => {
    assert.equal(calculateEarnedPoints(20), 10);
    assert.equal(calculateEarnedPoints(999), 10);
});

test("calculateNextReviewDate adds full-day offsets", () => {
    const now = 1_700_000_000_000;
    const oneDay = 24 * 60 * 60 * 1000;
    assert.equal(calculateNextReviewDate(1, now), now + oneDay);
    assert.equal(calculateNextReviewDate(7, now), now + (7 * oneDay));
});
