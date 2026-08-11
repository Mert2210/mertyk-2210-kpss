const fs = require('fs');

let content = fs.readFileSync('public/app.mjs', 'utf8');

const anchor = 'window.uploadPDFAndConvert = async () => {';
const newLogic = `
window.startAiImport = async (pilotCount) => {
    if (!window.socket) return window.showSoftFeedback("Sunucu bağlantısı yok.");
    const classSelect = document.getElementById("ai-import-class-select");
    const fileInput = document.getElementById("ai-import-file");

    if (!classSelect || !classSelect.value) return window.showSoftFeedback("Lütfen bir sınıf seçin.");
    if (!fileInput || !fileInput.files[0]) return window.showSoftFeedback("Lütfen bir PDF dosyası seçin.");

    const file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) return window.showSoftFeedback("PDF dosyası çok büyük (max 10MB).");

    document.getElementById("ai-import-status").innerText = "Yükleniyor ve başlatılıyor...";

    const fileInfo = {
        name: file.name,
        size: file.size,
        path: "mock_path_for_now.pdf"
    };

    window.socket.emit("aiImportStart", { classCode: classSelect.value, fileInfo, pilotCount });
};

// Global socket listener for start
if (window.socket) {
    window.socket.on("aiImportStarted", (data) => {
        if(data.success) {
            window.showSoftFeedback("AI Import başarıyla başlatıldı!");
            document.getElementById("ai-import-status").innerText = "İşleniyor (Job ID: " + data.jobId + ")";
            window.currentAiJobId = data.jobId;
            if(window.aiImportInterval) clearInterval(window.aiImportInterval);
            window.aiImportInterval = setInterval(() => {
                window.socket.emit("getAiImportStatus", data.jobId);
            }, 5000);
        }
    });

    window.socket.on("aiImportStatusData", (status) => {
        const el = document.getElementById("ai-import-status");
        if(el) {
            const s = status.pageStats || {};
            el.innerHTML = \`Durum: \${status.status} <br> Toplam: \${status.total_pages} | Sıradaki: \${s.queued || 0} | İşlenen: \${s.completed || 0} | Onay Bekleyen: \${s.review || 0} | Hata: \${s.failed || 0}\`;

            if (s.review > 0) {
                document.getElementById("ai-import-review-container").style.display = 'block';
            }
            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(window.aiImportInterval);
            }
        }
    });
}
`;

content = content.replace(anchor, newLogic + anchor);
fs.writeFileSync('public/app.mjs', content);
