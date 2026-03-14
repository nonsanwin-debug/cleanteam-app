import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/);
  if (match) env[match[1]] = match[2].replace(/"$/, '');
});

async function main() {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${env.SUPABASE_SERVICE_ROLE_KEY}`);
    const swagger = await res.json();
    const tableDef = swagger.definitions.companies;
    fs.writeFileSync('scripts/companies_schema.json', JSON.stringify(tableDef, null, 2));
    console.log('Saved to scripts/companies_schema.json');
}

main();
