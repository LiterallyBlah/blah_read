// Custom transformer for image files
// Returns a unique number for each file to simulate React Native's require() behavior
const path = require('path');

module.exports = {
  process(sourceText, sourcePath) {
    // Return a unique number based on the file path (simulates Metro's asset ID)
    const basename = path.basename(sourcePath);
    return {
      code: `module.exports = ${JSON.stringify(basename)};`,
    };
  },
};
