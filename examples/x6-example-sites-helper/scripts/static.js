#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fse = require('fs-extra')
const ora = require('ora')
const cp = require('child_process')
const chalk = require('chalk')
const { hashElement } = require('folder-hash')

const repo = fs.realpathSync(process.cwd())
const parts = repo.split('/')
const index = parts.indexOf('packages')
const dir = parts.slice(index + 1).join('/')
const name = parts.slice(index + 1).join('.')
const root = parts.slice(0, index).join('/')
const home = path.resolve(root, '../../')
const staticDir = path.join(root, '../../packages/x6-sites/static/demos')
const sourceDir = path.join(repo, 'build')
const targetDir = path.join(staticDir, dir)
const indexFile = path.join(targetDir, 'index.html')
const regex = /<meta\s+name="hash"\s+content="(.*?)"\s*\/>/

function getHash() {
  return Promise.all([
    hashElement(repo, {
      folders: { exclude: ['.*', 'node_modules', 'build'] },
    }),
    hashElement(path.join(home, 'examples/x6-example-sites-helper'), {
      folders: {
        include: ['src', 'loaders'],
        exclude: ['.*', 'node_modules', 'es', 'lib', 'scripts'],
      },
    }),
    hashElement(path.join(home, 'packages/x6/package.json')),
  ])
    .then((arr) => arr.map((item) => item.hash).join(' '))
    .then((hash) => Buffer.from(hash).toString('base64'))
}

function exec(hashcode) {
  let changed = true
  if (fs.existsSync(targetDir)) {
    const content = fs.readFileSync(indexFile, { encoding: 'utf8' })
    const match = content.match(regex)
    const previous = match && match[1]
    changed = previous !== hashcode
  }

  const msg = `${chalk.green('✔')} Deployed "${name}"`

  if (changed) {
    const spinner = ora(`Deploying "${name}"`).start()

    cp.exec('yarn build', { cwd: repo }, (err) => {
      if (!err) {
        fse.emptyDirSync(targetDir)
        fse.moveSync(sourceDir, targetDir, { overwrite: true })

        const raw = fs.readFileSync(indexFile, { encoding: 'utf8' })
        const title = `<meta name="hash" content="${hashcode}"/><title>${dir}</title>`
        const html = raw.replace(/<title>(.*)<\/title>/, title)

        fs.writeFileSync(indexFile, html, { encoding: 'utf8' })

        spinner.stop()
        console.log(msg)
      }
    })
  } else {
    console.log(msg)
  }
}

getHash().then(exec)
