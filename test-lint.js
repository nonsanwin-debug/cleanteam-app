const { execSync } = require('child_process');
const fs = require('fs');
try {
    execSync('npx eslint src/actions/shared-orders.ts --format json', { encoding: 'utf-8' });
} catch (error) {
    const data = JSON.parse(error.stdout);
    fs.writeFileSync('lint-clean.json', JSON.stringify(data[0].messages, null, 2));
}
