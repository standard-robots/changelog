/* eslint-disable no-console */
import { $fetch } from 'ofetch'
import { cyan, green } from 'kolorist'
import { notNullish } from '@antfu/utils'
import type { AuthorInfo, ChangelogOptions, Commit } from './types'

export async function sendReleaseOnGitlab(
  options: ChangelogOptions,
  content: string,
) {
  const headers = getHeaders(options)
  let url = `${options.baseUrlApi}/repos/${options.repo}/releases`
  let method = 'POST'

  try {
    const exists = await $fetch(`${options.baseUrlApi}/repos/${options.repo}/releases/tags/${options.to}`, {
      headers,
    })
    if (exists.url) {
      url = exists.url
      method = 'PATCH'
    }
  }
  catch (e) {
  }

  const body = {
    body: content,
    draft: options.draft || false,
    name: options.name || options.to,
    prerelease: options.prerelease,
    tag_name: options.to,
  }
  console.log(cyan(method === 'POST'
    ? 'Creating release notes...'
    : 'Updating release notes...'),
  )
  const res = await $fetch(url, {
    method,
    body: JSON.stringify(body),
    headers,
  })
  console.log(green(`Released on ${res.html_url}`))
}

function getHeaders(options: ChangelogOptions) {
  return {
    'PRIVATE-TOKEN': `${options.token}`,
  }
}

export async function resolveAuthorInfoOnGitlab(options: ChangelogOptions, info: AuthorInfo) {
  if (info.login)
    return info

  // token not provided, skip gitlab resolving
  if (!options.token)
    return info

  try {
    const data = await $fetch(`${options.baseUrlApi}/v4/users?search=${encodeURIComponent(info.email)}`, {
      headers: getHeaders(options),
    })
    info.login = data[0].username
    info.avatarUrl = data[0].avatar_url
  }
  catch {}

  if (info.login)
    return info

  return info
}

export async function resolveAuthorsOnGitlab(commits: Commit[], options: ChangelogOptions) {
  const map = new Map<string, AuthorInfo>()
  commits.forEach((commit) => {
    commit.resolvedAuthors = commit.authors.map((a, idx) => {
      if (!a.email || !a.name)
        return null
      if (!map.has(a.email)) {
        map.set(a.email, {
          commits: [],
          name: a.name,
          email: a.email,
        })
      }
      const info = map.get(a.email)!

      // record commits only for the first author
      if (idx === 0)
        info.commits.push(commit.shortHash)

      return info
    }).filter(notNullish)
  })
  const authors = Array.from(map.values())
  const resolved = await Promise.all(authors.map(info => resolveAuthorInfoOnGitlab(options, info)))
  console.log(resolved, 'resolved')
  const loginSet = new Set<string>()
  const nameSet = new Set<string>()
  return resolved
    .sort((a, b) => (a.login || a.name).localeCompare(b.login || b.name))
    .filter((i) => {
      if (i.login && loginSet.has(i.login))
        return false
      if (i.login) {
        loginSet.add(i.login)
      }
      else {
        if (nameSet.has(i.name))
          return false
        nameSet.add(i.name)
      }
      return true
    })
}

export async function hasTagOnGitlab(tag: string, options: ChangelogOptions) {
  try {
    await $fetch(`${options.baseUrlApi}/repos/${options.repo}/git/ref/tags/${tag}`, {
      headers: getHeaders(options),
    })
    return true
  }
  catch (e) {
    return false
  }
}
