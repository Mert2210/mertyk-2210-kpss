function toPublicCompetitiveQuestion(question) {
    if (!question || typeof question !== "object") {
        return {
            soru: "",
            siklar: [],
            ders: "",
            image: ""
        };
    }

    return {
        soru: question.soru,
        siklar: Array.isArray(question.siklar) ? [...question.siklar] : [],
        ders: question.ders,
        image: question.image
    };
}

function normalizeQuestionIndex(rawQuestionIndex) {
    const parsed = Number(rawQuestionIndex);
    return Number.isInteger(parsed) ? parsed : null;
}

function validateCompetitiveSubmission({ room, socketId, payload, now = Date.now() }) {
    if (!room || !room.gameStarted) {
        return { ok: false, code: "ROOM_NOT_ACTIVE" };
    }

    const player = room.players?.[socketId];
    if (!player) {
        return { ok: false, code: "UNAUTHORIZED_PLAYER" };
    }

    const question = room.questions?.[room.currentQuestionIndex];
    if (!question || !Array.isArray(question.siklar)) {
        return { ok: false, code: "QUESTION_NOT_READY" };
    }

    if (player.hasAnsweredThisRound) {
        return { ok: false, code: "DUPLICATE_ANSWER" };
    }

    if (!payload || typeof payload !== "object") {
        return { ok: false, code: "MALFORMED_ANSWER" };
    }

    const answerIndex = Number(payload.answerIndex);
    if (!Number.isInteger(answerIndex)) {
        return { ok: false, code: "MALFORMED_ANSWER" };
    }

    if (answerIndex < -1 || answerIndex >= question.siklar.length) {
        return { ok: false, code: "ANSWER_OUT_OF_RANGE" };
    }

    const submittedQuestionIndex = normalizeQuestionIndex(payload.questionIndex);
    const activeQuestionIndex = room.currentQuestionIndex + 1;
    if (submittedQuestionIndex !== null && submittedQuestionIndex !== activeQuestionIndex) {
        return { ok: false, code: "ANSWER_TOO_LATE" };
    }

    if (room.timerMode === "question" && Number(room.settings?.duration) > 0) {
        const questionDurationMs = Number(room.settings.duration) * 1000;
        if (questionDurationMs > 0 && (now - Number(room.questionStartTime || 0)) > questionDurationMs) {
            return { ok: false, code: "ANSWER_TOO_LATE" };
        }
    }

    return { ok: true, player, question, answerIndex };
}

function scoreCompetitiveAnswer({ question, answerIndex, elapsedSeconds, calculateEarnedPoints }) {
    const correctIndex = Number(question?.dogru);
    const isCorrect = answerIndex !== -1 && Number.isInteger(correctIndex) && answerIndex === correctIndex;

    if (isCorrect) {
        const earnedPoints = calculateEarnedPoints(elapsedSeconds);
        return { correct: true, points: earnedPoints, scoreDelta: earnedPoints };
    }

    if (answerIndex === -1) {
        return { correct: false, points: 0, scoreDelta: 0 };
    }

    return { correct: false, points: 0, scoreDelta: -5 };
}

function getSubmissionErrorMessage(code) {
    switch (code) {
    case "UNAUTHORIZED_PLAYER":
        return "Bu odada cevap gönderme yetkiniz yok.";
    case "DUPLICATE_ANSWER":
        return "Bu soru için cevap zaten gönderildi.";
    case "ANSWER_TOO_LATE":
        return "Bu soru için süre doldu.";
    case "MALFORMED_ANSWER":
    case "ANSWER_OUT_OF_RANGE":
        return "Geçersiz cevap gönderimi.";
    case "ROOM_NOT_ACTIVE":
    case "QUESTION_NOT_READY":
    default:
        return "Oyun şu anda cevap kabul etmiyor.";
    }
}

module.exports = {
    toPublicCompetitiveQuestion,
    validateCompetitiveSubmission,
    scoreCompetitiveAnswer,
    getSubmissionErrorMessage
};
