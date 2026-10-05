const test = require("node:test");
const assert = require("node:assert/strict");

const {
    toPublicCompetitiveQuestion,
    validateCompetitiveSubmission,
    scoreCompetitiveAnswer,
    getSubmissionErrorMessage
} = require("./competitive-game");

function buildRoom(overrides = {}) {
    return {
        gameStarted: true,
        players: {
            socketA: { hasAnsweredThisRound: false, score: 0 }
        },
        questions: [{
            soru: "Soru",
            siklar: ["A", "B", "C", "D"],
            dogru: 1,
            solutionText: "Açıklama"
        }],
        currentQuestionIndex: 0,
        timerMode: "question",
        settings: { duration: 10 },
        questionStartTime: 1_000,
        ...overrides
    };
}

test("toPublicCompetitiveQuestion strips answer key fields", () => {
    const sanitized = toPublicCompetitiveQuestion({
        soru: "Soru",
        siklar: ["A", "B"],
        ders: "Tarih",
        image: "img",
        dogru: 1,
        solutionText: "detay"
    });

    assert.deepStrictEqual(sanitized, {
        soru: "Soru",
        siklar: ["A", "B"],
        ders: "Tarih",
        image: "img"
    });
    assert.equal(Object.hasOwn(sanitized, "dogru"), false);
    assert.equal(Object.hasOwn(sanitized, "solutionText"), false);
});

test("validateCompetitiveSubmission rejects malformed or unauthorized payloads", () => {
    const room = buildRoom();
    assert.equal(validateCompetitiveSubmission({ room, socketId: "unknown", payload: { answerIndex: 1 } }).ok, false);
    assert.equal(validateCompetitiveSubmission({ room, socketId: "socketA", payload: null }).code, "MALFORMED_ANSWER");
    assert.equal(validateCompetitiveSubmission({ room, socketId: "socketA", payload: { answerIndex: "x" } }).code, "MALFORMED_ANSWER");
    assert.equal(validateCompetitiveSubmission({ room, socketId: "socketA", payload: { answerIndex: 99 } }).code, "ANSWER_OUT_OF_RANGE");
});

test("validateCompetitiveSubmission rejects duplicate and late answers", () => {
    const duplicateRoom = buildRoom({
        players: {
            socketA: { hasAnsweredThisRound: true, score: 0 }
        }
    });
    assert.equal(
        validateCompetitiveSubmission({ room: duplicateRoom, socketId: "socketA", payload: { answerIndex: 1 }, now: 1_500 }).code,
        "DUPLICATE_ANSWER"
    );

    const lateByQuestionIndex = validateCompetitiveSubmission({
        room: buildRoom(),
        socketId: "socketA",
        payload: { answerIndex: 1, questionIndex: 9 },
        now: 1_500
    });
    assert.equal(lateByQuestionIndex.code, "ANSWER_TOO_LATE");

    const lateByTime = validateCompetitiveSubmission({
        room: buildRoom(),
        socketId: "socketA",
        payload: { answerIndex: 1, questionIndex: 1 },
        now: 12_100
    });
    assert.equal(lateByTime.code, "ANSWER_TOO_LATE");
});

test("validateCompetitiveSubmission accepts valid answer payload", () => {
    const result = validateCompetitiveSubmission({
        room: buildRoom(),
        socketId: "socketA",
        payload: { answerIndex: 1, questionIndex: 1 },
        now: 5_000
    });

    assert.equal(result.ok, true);
    assert.equal(result.answerIndex, 1);
});

test("scoreCompetitiveAnswer applies correct, wrong and blank scoring rules", () => {
    const question = { dogru: 2 };
    const calc = () => 17;

    assert.deepStrictEqual(
        scoreCompetitiveAnswer({ question, answerIndex: 2, elapsedSeconds: 1, calculateEarnedPoints: calc }),
        { correct: true, points: 17, scoreDelta: 17 }
    );
    assert.deepStrictEqual(
        scoreCompetitiveAnswer({ question, answerIndex: 0, elapsedSeconds: 1, calculateEarnedPoints: calc }),
        { correct: false, points: 0, scoreDelta: -5 }
    );
    assert.deepStrictEqual(
        scoreCompetitiveAnswer({ question, answerIndex: -1, elapsedSeconds: 1, calculateEarnedPoints: calc }),
        { correct: false, points: 0, scoreDelta: 0 }
    );
});

test("getSubmissionErrorMessage returns safe user-facing messages", () => {
    assert.equal(getSubmissionErrorMessage("UNAUTHORIZED_PLAYER"), "Bu odada cevap gönderme yetkiniz yok.");
    assert.equal(getSubmissionErrorMessage("ANSWER_TOO_LATE"), "Bu soru için süre doldu.");
    assert.equal(getSubmissionErrorMessage("ANSWER_OUT_OF_RANGE"), "Geçersiz cevap gönderimi.");
});
