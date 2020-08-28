#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const repo = fs.realpathSync(process.cwd())
const parts = repo.split('/')
const index = parts.indexOf('packages')
const root = index >= 0 ? parts.slice(0, index).join('/') : repo
const home = path.resolve(root, '../../')
const configDir = 'node_modules/react-scripts/config'
const configFile = path.join(home, configDir, 'webpack.config.js')
let content = fs.readFileSync(configFile, { encoding: 'utf8' })

// 修改 node_modules 下 react-scripts 的配置文件来提升 DEMO 的构建速度
if (content.indexOf('minimize: isEnvProduction') !== -1) {
  content = content
    // 禁用压缩
    .replace('minimize: isEnvProduction', 'minimize: false')
    // 禁止生成 manifest
    .replace('new ManifestPlugin({', 'false && new ManifestPlugin({')
    // 禁止生成 worker
    .replace(
      'new WorkboxWebpackPlugin.GenerateSW({',
      `false && new WorkboxWebpackPlugin.GenerateSW({`,
    )

  if (!process.env.CI) {
    // 修改缓存文件位置，以便在持续集成环境中将缓存持久化
    content = content
      .replace(
        'module.exports =',
        `
  const appName = paths.appPath.replace(/\\//g, '.');
  const webpackCacheDir = path.join(process.env['HOME'], '.webpack/cache', appName);
  module.exports =`,
      )
      .replace(
        /cacheDirectory:\s*true,/g,
        `cacheDirectory: path.join(webpackCacheDir, 'babel-loader'),`,
      )
      .replace(
        'eslintPath: ',
        `cache: path.join(webpackCacheDir, 'eslint-loader'),
                eslintPath: `,
      )
  }

  fs.writeFileSync(configFile, content, { encoding: 'utf8' })
}
