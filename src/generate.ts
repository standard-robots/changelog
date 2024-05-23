import { getGitDiff } from 'changelogen'
import type { ChangelogOptions } from './types'
import { generateMarkdown } from './markdown'
import { resolveAuthorsOnGithub } from './github'
import { resolveConfig } from './config'
import { parseCommits } from './parse'
import { resolveAuthorsOnGitlab } from './gitlab'

export async function generate(options: ChangelogOptions) {
  const resolved = await resolveConfig(options)

  const rawCommits = await getGitDiff(resolved.from, resolved.to)
  const commits = parseCommits(rawCommits, resolved)
  if (resolved.contributors) {
    switch (resolved.provider) {
      case 'github':
        await resolveAuthorsOnGithub(commits, resolved)
        break
      case 'gitlab':
        await resolveAuthorsOnGitlab(commits, resolved)
        break
    }
  }
  const md = generateMarkdown(commits, resolved)

  return { config: resolved, md, commits }
}
