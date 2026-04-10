const fs = require("fs");

function readJsonFile(filePath, fallbackValue) {
    if (!fs.existsSync(filePath)) return fallbackValue;
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        return fallbackValue;
    }
}

function writeJsonFile(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

module.exports = {
    readJsonFile,
    writeJsonFile
};
