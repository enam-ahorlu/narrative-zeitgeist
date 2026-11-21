// Lints the server code file by file, then lints the browser scripts together in
// the order index.html loads them. The page shares one global scope across scripts,
// so linting them individually would report every cross-file name as undefined.
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { ESLint } = require('eslint');

const root = path.join(__dirname, '..');
const page = readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...page.matchAll(/<script src="\/((?:assets|catalogues)\/[^"]+)"/g)].map(match => match[1]);
const inline = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()?.[1];
if (!inline || !order.length) throw new Error('Could not find the page scripts');

const bundle = [...order.map(file => readFileSync(path.join(root, file), 'utf8')), inline].join('\n');

(async () => {
  const eslint = new ESLint({ cwd: root });
  const serverFiles = ['api', 'lib', 'scripts'].flatMap(dir =>
    readdirSync(path.join(root, dir)).filter(name => name.endsWith('.js')).map(name => path.join(dir, name)));
  const results = [
    ...await eslint.lintFiles(serverFiles),
    ...await eslint.lintText(bundle, { filePath: path.join(root, 'browser-bundle.js') })
  ];
  let errors = 0;
  for (const result of results) {
    for (const message of result.messages.filter(item => item.severity === 2)) {
      errors++;
      console.error(`${result.filePath === path.join(root, 'browser-bundle.js') ? 'browser bundle' : path.relative(root, result.filePath)}:${message.line} ${message.message} (${message.ruleId})`);
    }
  }
  if (errors) {
    console.error(`${errors} lint error(s)`);
    process.exit(1);
  }
  console.log('Lint passed: server files and the browser bundle have no errors.');
})();
