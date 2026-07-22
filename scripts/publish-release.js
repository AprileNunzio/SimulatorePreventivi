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
const version = pkg.version;
const tag = `v${version}`;

const owner = 'AprileNunzio';
const repo = 'SimulatorePreventivi';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body || '{}') });
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

async function publish() {
  console.log('Verifica release GitHub per', tag);

  let relRes = await request({
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/releases/tags/${tag}`,
    method: 'GET',
    headers: {
      'User-Agent': 'NunzioTech-Release-Uploader',
      'Authorization': `token ${token}`
    }
  });

  let releaseId;
  let uploadUrl;
  let existingAssets = [];

  if (relRes.statusCode === 200 && relRes.body.id) {
    releaseId = relRes.body.id;
    uploadUrl = relRes.body.upload_url;
    existingAssets = relRes.body.assets || [];
    console.log('Release trovata. ID:', releaseId);

    const updateBody = JSON.stringify({
      name: `Simulatore Preventivi Enterprise v${version} — NunzioTech`,
      body: `## 🚀 Release v${version} — NunzioTech Enterprise ERP Architecture\n\n### 📦 File di Installazione Incluso\n- **Installer Automatico per Windows**: \`Simulatore.Preventivi.Setup.${version}.exe\`\n\n### ✨ Novità della Versione v${version}\n- **Motore Auto-Updater Potenziato**: Risoluzione dinamica degli asset ed eliminazione degli errori di download\n- **Completamento 100% dei 4 Pilastri Operativi**\n- **Interfacce UI completate**: Gestione DDT e Scadenzario Incassi con rateizzazioni\n- **Cloud SDI Connector**: Trasmissione FatturePA v1.2.2 e gestione Fatture Passive d'Acquisto\n- **Reintegro Magazzino**: Ordini d'acquisto automatici per scorta minima e valorizzazione PMP\n- **Multi-Utente RBAC & Riconciliazione Bancaria**: Controllo accessi basato sui ruoli ed abbinamento estratti conto CSV/CBI\n\nDeveloped with excellence by **NunzioTech (Nunzio Aprile)**.`
    });

    await request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/${releaseId}`,
      method: 'PATCH',
      headers: {
        'User-Agent': 'NunzioTech-Release-Uploader',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateBody)
      }
    }, updateBody);
  } else {
    console.log('Creazione nuova release su GitHub...');
    const createBody = JSON.stringify({
      tag_name: tag,
      target_commitish: 'main',
      name: `Simulatore Preventivi Enterprise v${version} — NunzioTech`,
      body: `## 🚀 Release v${version} — NunzioTech Enterprise ERP Architecture\n\n### 📦 File di Installazione Incluso\n- **Installer Automatico per Windows**: \`Simulatore.Preventivi.Setup.${version}.exe\`\n\n### ✨ Novità della Versione v${version}\n- **Motore Auto-Updater Potenziato**: Risoluzione dinamica degli asset ed eliminazione degli errori di download\n- **Completamento 100% dei 4 Pilastri Operativi**\n- **Interfacce UI completate**: Gestione DDT e Scadenzario Incassi con rateizzazioni\n- **Cloud SDI Connector**: Trasmissione FatturePA v1.2.2 e gestione Fatture Passive d'Acquisto\n- **Reintegro Magazzino**: Ordini d'acquisto automatici per scorta minima e valorizzazione PMP\n- **Multi-Utente RBAC & Riconciliazione Bancaria**: Controllo accessi basato sui ruoli ed abbinamento estratti conto CSV/CBI\n\nDeveloped with excellence by **NunzioTech (Nunzio Aprile)**.`,
      draft: false,
      prerelease: false
    });

    const newRel = await request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases`,
      method: 'POST',
      headers: {
        'User-Agent': 'NunzioTech-Release-Uploader',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(createBody)
      }
    }, createBody);

    if (newRel.statusCode !== 201) {
      console.error('Errore creazione release:', newRel.body);
      process.exit(1);
    }
    releaseId = newRel.body.id;
    uploadUrl = newRel.body.upload_url;
    console.log('Release creata con successo! ID:', releaseId);
  }

  const distDir = path.join(__dirname, '..', 'dist');
  const filesToUpload = [
    { name: `Simulatore.Preventivi.Setup.${version}.exe`, file: path.join(distDir, `Simulatore Preventivi Setup ${version}.exe`) },
    { name: 'latest.yml', file: path.join(distDir, 'latest.yml') }
  ];

  for (const item of filesToUpload) {
    if (!fs.existsSync(item.file)) {
      console.warn('File non trovato in dist:', item.file);
      continue;
    }

    const oldAsset = existingAssets.find(a => a.name === item.name);
    if (oldAsset) {
      console.log(`Rimozione vecchio asset preesistente ${item.name} (ID: ${oldAsset.id})...`);
      await request({
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/assets/${oldAsset.id}`,
        method: 'DELETE',
        headers: {
          'User-Agent': 'NunzioTech-Release-Uploader',
          'Authorization': `token ${token}`
        }
      });
    }

    console.log(`Caricamento asset ${item.name} (${fs.statSync(item.file).size} byte)...`);
    const fileData = fs.readFileSync(item.file);

    const cleanUploadUrl = uploadUrl.replace(/\{.*?\}$/, '');
    const urlObj = new URL(`${cleanUploadUrl}?name=${encodeURIComponent(item.name)}`);

    const uploadRes = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'User-Agent': 'NunzioTech-Release-Uploader',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileData.length
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(fileData);
      req.end();
    });

    console.log(`Asset ${item.name} caricato con successo (Status ${uploadRes.statusCode})!`);
  }

  console.log('PROCESSO DI RILASCIO COMPLETATO CON SUCCESSO SU GITHUB!');
}

publish().catch(console.error);
