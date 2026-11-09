const { compile } = require('@tailwindcss/node');
const fs = require('fs');
const path = require('path');

function getFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js', '.html']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        files = files.concat(getFiles(fullPath, extensions));
      }
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function build() {
  const baseDir = path.resolve(__dirname, '..');
  const files = [
    ...getFiles(path.join(baseDir, 'app')),
    ...getFiles(path.join(baseDir, 'components')),
    ...getFiles(path.join(baseDir, 'lib')),
  ];

  const candidateSet = new Set();
  const wordRegex = /[A-Za-z0-9_\-\/\[\]\:\.\%\#]+/g;

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const matches = content.match(wordRegex);
    if (matches) {
      for (const m of matches) candidateSet.add(m);
    }
  }

  const cssInput = fs.readFileSync(path.join(baseDir, 'app', 'globals-base.css'), 'utf8');
  const compiler = await compile(cssInput, {
    base: baseDir,
    onDependency: () => {},
  });

  const compiledCss = compiler.build(Array.from(candidateSet));
  fs.writeFileSync(path.join(baseDir, 'app', 'globals.css'), compiledCss, 'utf8');
  console.log(`Successfully compiled Tailwind CSS! Total size: ${compiledCss.length} bytes`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

