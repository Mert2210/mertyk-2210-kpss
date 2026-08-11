const fs = require('fs');

let content = fs.readFileSync('public/app.js', 'utf8');

const anchor = 'window.startAiImport = async (pilotCount) => {';
const reviewLogic = `
window.aiImportApprove = (pageId, questionId) => {
    if(!window.socket) return;
    window.socket.emit("aiImportApprove", { pageId, questionId });
};

window.aiImportReject = (pageId, questionId) => {
    if(!window.socket) return;
    window.socket.emit("aiImportReject", { pageId, questionId });
};

window.aiImportRegenerate = (pageId, questionId) => {
    if(!window.socket) return;
    window.socket.emit("aiImportRegenerate", { pageId, questionId });
};

window.aiImportPublish = () => {
    if(!window.socket || !window.currentAiJobId) return;
    window.socket.emit("aiImportPublish", window.currentAiJobId);
};
`;

content = content.replace(anchor, reviewLogic + anchor);
fs.writeFileSync('public/app.js', content);
