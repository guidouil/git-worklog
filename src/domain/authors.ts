import type { AuthorFilter, GitCommit } from './types.js';

export function matchesAuthor(commit: GitCommit, filters: AuthorFilter[]): boolean {
  if (filters.length === 0) return true;
  const name = commit.authorName.toLocaleLowerCase();
  const email = commit.authorEmail.toLocaleLowerCase();
  return filters.some((filter) => {
    const nameMatches = filter.name === undefined || name.includes(filter.name.toLocaleLowerCase());
    const emailMatches =
      filter.emails === undefined ||
      filter.emails.length === 0 ||
      filter.emails.some((candidate) => email === candidate.toLocaleLowerCase());
    return nameMatches && emailMatches;
  });
}

export function filterCommitsByAuthor(commits: GitCommit[], filters: AuthorFilter[]): GitCommit[] {
  return commits.filter((commit) => matchesAuthor(commit, filters));
}
