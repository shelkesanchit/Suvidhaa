const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
const envCandidates = ['.env', 'env'];

for (const envFile of envCandidates) {
  const fullPath = path.join(projectRoot, envFile);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    break;
  }
}
