function calculateEarnedPoints(elapsedSeconds) {
    const elapsed = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
    return 10 + Math.ceil(Math.max(0, 20 - elapsed) / 2);
}

function calculateNextReviewDate(additionalDays, now = Date.now()) {
    return now + (additionalDays * 24 * 60 * 60 * 1000);
}

module.exports = {
    calculateEarnedPoints,
    calculateNextReviewDate
};
