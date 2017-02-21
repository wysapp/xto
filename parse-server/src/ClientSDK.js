var semver = require('semver');

function fromString(version) {
  const versionRE = /([-a-zA-Z]+)([0-9\.]+)/;
  const match = version.toLowerCase().match(versionRE);
  if (match && match.length === 3) {
    return {
      sdk: match[1],
      version: match[2]
    }
  }
  return undefined;
}

module.exports = {
  fromString
};