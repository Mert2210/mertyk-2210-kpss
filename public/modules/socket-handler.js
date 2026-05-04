/**
 * Socket Olayları Modülü (Socket Handler Module)
 *
 * Socket.io olay adlarını merkezi sabitleri ve yardımcı
 * fonksiyonları içerir.
 *
 * Not: Temel socket bağlantısı public/app.js içindedir.
 * Bu modül, bağımsız test edilebilir saf fonksiyonları içerir.
 */

/** Socket olay adlarının merkezi sabitleri */
export const SOCKET_EVENTS = Object.freeze({
    // Server → Client
    UPDATE_FILTERS: 'updateFilters',
    ERROR_MSG: 'errorMsg',
    ROOM_STATE: 'roomState',
    QUESTION_DATA: 'questionData',
    ANSWER_RESULT: 'answerResult',
    LEADERBOARD: 'leaderboard',
    MY_STATS_DATA: 'myStatsData',
    STUDENT_QUESTIONS: 'studentQuestions',
    CLASS_QUESTIONS: 'classQuestions',

    // Client → Server
    JOIN_ROOM: 'joinRoom',
    SUBMIT_ANSWER: 'submitAnswer',
    ADD_NEW_QUESTION: 'addNewQuestion',
    DELETE_QUESTION: 'deleteQuestion',
    GET_MY_STATS: 'getMyStats',
    GET_STUDENT_QUESTIONS: 'getStudentQuestions',
    UPLOAD_STUDENT_QUESTION: 'uploadStudentQuestion',
});

/**
 * Socket bağlantısının aktif olup olmadığını kontrol eder.
 * @param {object|null} socket - socket.io socket instance
 * @returns {boolean}
 */
export function isSocketConnected(socket) {
    return !!(socket && socket.connected);
}

/**
 * Socket'e güvenli şekilde emit yapar (bağlı değilse hata fırlatır).
 * @param {object} socket
 * @param {string} event
 * @param {*} payload
 * @throws {Error} Socket bağlı değilse
 */
export function safeEmit(socket, event, payload) {
    if (!isSocketConnected(socket)) {
        throw new Error('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.');
    }
    socket.emit(event, payload);
}

/**
 * Oda kodunu normalleştirir (büyük harf, trim, alfanumerik).
 * @param {string} code
 * @returns {string}
 */
export function normalizeRoomCode(code) {
    return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
