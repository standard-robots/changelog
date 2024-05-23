import process from 'node:process'
import { getRepoConfig } from 'changelogen'
import { getCurrentGitBranch, getFirstGitCommit, getGitHubRepo, getGitRepo, getLastMatchingTag, isPrerelease } from './git'
import type { ChangelogOptions, ResolvedChangelogOptions } from './types'

export function defineConfig(config: ChangelogOptions) {
  return config
}

const defaultConfig: ChangelogOptions = {
  scopeMap: {},
  types: {
    feat: { title: '🚀 Features' },
    fix: { title: '🐞 Bug Fixes' },
    perf: { title: '🏎 Performance' },
    chore: { title: '🧹 Chores' },
  },
  titles: {
    breakingChanges: '🚨 Breaking Changes',
  },
  contributors: true,
  capitalize: true,
  group: true,
}

export async function resolveConfig(options: ChangelogOptions) {
  const { loadConfig } = await import('c12')
  const config = await loadConfig<ChangelogOptions>({
    name: 'changelogithub',
    defaults: defaultConfig,
    overrides: options,
    packageJson: 'changelogithub',
  }).then(r => r.config || defaultConfig)
  config.provider = config.github ? 'github' : 'gitlab'
  config.to = config.to || await getCurrentGitBranch()
  config.from = config.from || await getLastMatchingTag(config.to) || await getFirstGitCommit()
  config.repo = getRepoConfig(await getGitRepo())
  config.prerelease = config.prerelease ?? isPrerelease(config.to)

  switch (config.provider) {
    case 'github':
      config.token = config.token || process.env.GITHUB_TOKEN
      config.baseUrl = 'https://github.com'
      config.baseUrlApi = 'https://api.github.com'
      break
    case 'gitlab':
      config.token = config.token || process.env.GITLAB_TOKEN
      config.baseUrl = config.baseUrl || 'https://gitlab.com'
      config.baseUrlApi = config.baseUrlApi || 'https://gitlab.com/api/v4'
      break
  }

  return config as ResolvedChangelogOptions
}
