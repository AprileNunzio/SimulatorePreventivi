const { execSync } = require('child_process');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

run('npm version patch --no-git-tag-version');

delete require.cache[require.resolve('../package.json')];
const pkg = require('../package.json');
const tag = `v${pkg.version}`;

run('git add package.json package-lock.json');
run(`git commit -m "${pkg.version}"`);
run(`git tag -a ${tag} -m "${tag}"`);

console.log(`Versione bumpata a ${pkg.version}, commit e tag ${tag} creati localmente.`);
