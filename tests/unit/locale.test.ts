import { describe, expect, it } from 'vitest';
import { resolveDisplayLocale } from '../../src/utils/locale.js';

describe('display locale fallback', () => {
  it('keeps French when the runtime supports it', () => {
    expect(resolveDisplayLocale('fr', () => ['fr'])).toBe('fr');
  });

  it('falls back to English when French ICU data is unavailable', () => {
    expect(resolveDisplayLocale('fr', () => [])).toBe('en');
  });

  it('keeps an explicit English locale', () => {
    expect(resolveDisplayLocale('en', () => [])).toBe('en');
  });
});
