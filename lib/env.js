const fs = require('fs');

function stripSurroundingQuotes(value) {
  const isDoubleQuoted = value.startsWith('"') && value.endsWith('"');
  const isSingleQuoted = value.startsWith("'") && value.endsWith("'");
  return (isDoubleQuoted || isSingleQuoted) ? value.slice(1, -1) : value;
}

function parseEnvLine(line) {
  const trimmedLine = line.trim();
  const isBlankOrComment = trimmedLine === '' || trimmedLine.startsWith('#');
  if (isBlankOrComment) return null;

  const separatorIndex = trimmedLine.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
  return { key, value: stripSurroundingQuotes(rawValue) };
}

function loadEnvironmentVariables(envFilePath) {
  if (!fs.existsSync(envFilePath)) return;

  const envFileContents = fs.readFileSync(envFilePath, 'utf8');
  envFileContents.split('\n').forEach(line => {
    const parsedLine = parseEnvLine(line);
    if (!parsedLine) return;

    const isAlreadySet = parsedLine.key in process.env;
    if (!isAlreadySet) process.env[parsedLine.key] = parsedLine.value;
  });
}

module.exports = { loadEnvironmentVariables };
