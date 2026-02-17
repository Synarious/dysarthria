#!/usr/bin/env node

import { execSync } from 'node:child_process'

const REMOTE = 'https://github.com/Synarious/dysarthria.git'

try {
  console.log(`Checking access to ${REMOTE}...`)
  execSync(`git ls-remote ${REMOTE}`, { stdio: 'ignore' })
} catch (error) {
  console.log('gh-pages remote unreachable; skipping deploy.')
  process.exit(0)
}

try {
  execSync('npm run build', { stdio: 'inherit' })
  execSync('npx gh-pages -d dist', { stdio: 'inherit' })
} catch (error) {
  console.error('Deployment failed:', error.message)
  process.exit(error.status || 1)
}
