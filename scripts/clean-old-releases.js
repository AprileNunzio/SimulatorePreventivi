const fs = require('fs');
const path = require('path');
const https = require('https');

const token = process.env.GH_TOKEN;
if (!token) {
  console.error('GH_TOKEN missing');
  process.exit(1);
}

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentTag = `v${pkg.version}`;

const owner = 'AprileNunzio';
const repo = 'SimulatorePreventivi';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body || '[]') });
        } catch {
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function cleanOldReleases() {
  console.log('Recupero elenco completo delle Release da GitHub per preservare', currentTag);

  const res = await request({
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/releases?per_page=100`,
    method: 'GET',
    headers: {
      'User-Agent': 'NunzioTech-Release-Cleaner',
      'Authorization': `token ${token}`
    }
  });

  if (res.statusCode !== 200 || !Array.isArray(res.body)) {
    console.error('Errore nel recupero delle release:', res.body);
    process.exit(1);
  }

  const releases = res.body;
  console.log(`Trovate ${releases.length} release su GitHub.`);

  for (const rel of releases) {
    if (rel.tag_name === currentTag) {
      console.log(`Mantenimento della release ufficiale: ${rel.tag_name} (ID: ${rel.id})`);
      continue;
    }

    console.log(`Eliminazione vecchia release: ${rel.tag_name} / ${rel.name} (ID: ${rel.id})...`);
    const delRes = await request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/${rel.id}`,
      method: 'DELETE',
      headers: {
        'User-Agent': 'NunzioTech-Release-Cleaner',
        'Authorization': `token ${token}`
      }
    });

    console.log(`Status eliminazione ID ${rel.id}: ${delRes.statusCode}`);
  }

  console.log(`PULIZIA RELEASE COMPLETA! Rimasta unicamente la release ${currentTag}.`);
}

cleanOldReleases().catch(console.error);
