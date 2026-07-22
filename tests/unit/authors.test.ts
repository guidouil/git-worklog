import { describe, expect, it } from 'vitest';
import { filterCommitsByAuthor, matchesAuthor } from '../../src/domain/authors.js';
import { commit } from '../helpers.js';

describe('author filters', () => {
  it('matches names case-insensitively and emails exactly', () => {
    const item = commit(new Date(), { authorName: 'Guillaume Dupont' });
    expect(matchesAuthor(item, [{ name: 'guillaume' }])).toBe(true);
    expect(matchesAuthor(item, [{ emails: ['GUI@EXAMPLE.COM'] }])).toBe(true);
    expect(matchesAuthor(item, [{ name: 'Guillaume', emails: ['other@example.com'] }])).toBe(false);
  });

  it('combines filters with OR and accepts all with an empty list', () => {
    const commits = [
      commit(new Date(), { authorName: 'Alice' }),
      commit(new Date(), { authorName: 'Bob', hash: 'b'.repeat(40) }),
    ];
    expect(filterCommitsByAuthor(commits, [])).toHaveLength(2);
    expect(filterCommitsByAuthor(commits, [{ name: 'Bob' }])).toHaveLength(1);
  });
});
