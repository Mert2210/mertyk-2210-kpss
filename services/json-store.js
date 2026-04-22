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

module.exports = {
    readJsonFile,
    writeJsonFile
};
