const BASE_SCORE = 10;
const MAX_BONUS_SECONDS = 20;
const BONUS_DIVISOR = 2;

/**
 * Base score is 10. An additional bonus is awarded for fast answers:
 * up to 10 bonus points within the first 20 seconds (0.5 points per second saved).
 */
function calculateEarnedPoints(elapsedSeconds) {
    const elapsed = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
    return BASE_SCORE + Math.ceil(Math.max(0, MAX_BONUS_SECONDS - elapsed) / BONUS_DIVISOR);
}

function calculateNextReviewDate(additionalDays, now = Date.now()) {
    return now + (additionalDays * 24 * 60 * 60 * 1000);
}

module.exports = {
    calculateEarnedPoints,
    calculateNextReviewDate
};
