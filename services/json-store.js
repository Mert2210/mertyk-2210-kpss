const fs = require("fs");

function readJsonFile(filePath, fallbackValue) {
    if (!fs.existsSync(filePath)) return fallbackValue;
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        console.error(`JSON parse error at ${filePath}:`, error.message);
        return fallbackValue;
    }
}

function writeJsonFile(filePath, value) {
    const tmpPath = filePath + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2));
    fs.renameSync(tmpPath, filePath);
}

/**
 * Birden fazla dosyaya atomik toplu yazma işlemi gerçekleştirir.
 * Her bir giriş { filePath, value } biçiminde bir nesne olmalıdır.
 * Herhangi bir yazma başarısız olursa hata fırlatılır; o noktaya kadar
 * tamamlanan yazma işlemleri geri alınmaz.
 *
 * @param {Array<{ filePath: string, value: * }>} entries
 */
function batchWriteJsonFiles(entries) {
    if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
    for (const entry of entries) {
        writeJsonFile(entry.filePath, entry.value);
    }
}

module.exports = {
    readJsonFile,
    writeJsonFile,
    batchWriteJsonFiles
};
