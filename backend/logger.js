const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logFilePath = '';

function initLogger() {
    // Determine a stable location for logs. In electron it's usually app.getPath('userData')
    // If app is not ready or not available, fallback to a local 'logs' dir.
    const logDir = app ? path.join(app.getPath('userData'), 'logs') : path.join(__dirname, '..', 'logs');
    
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    logFilePath = path.join(logDir, 'app-error.log');
}

function error(message, stack = null) {
    if (!logFilePath) initLogger();
    
    const timestamp = new Date().toISOString();
    let logMsg = `[${timestamp}] ERROR: ${message}\n`;
    if (stack) {
        logMsg += `STACK TRACE:\n${stack}\n`;
    }
    logMsg += `--------------------------------------------------\n`;
    
    console.error(logMsg);
    try {
        fs.appendFileSync(logFilePath, logMsg, 'utf8');
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
}

function info(message) {
    if (!logFilePath) initLogger();
    
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] INFO: ${message}\n`;
    
    console.log(logMsg);
    try {
        fs.appendFileSync(logFilePath, logMsg, 'utf8');
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
}

module.exports = {
    initLogger,
    error,
    info
};
