import { addRecent, RECENT_MAX } from '@/features/search/hooks/recent-searches';

describe('recent searches (L1 #4)', () => {
  it('puts the newest first and does not repeat a word', () => {
    expect(addRecent(['كشري', 'شاورما'], 'شاورما')).toEqual(['شاورما', 'كشري']);
    expect(addRecent(['كشري'], '  كنافة ')).toEqual(['كنافة', 'كشري']);
  });

  it('treats the same word in another case or spacing as the same', () => {
    expect(addRecent(['Pizza Hut'], 'pizza   hut')).toEqual(['pizza hut']);
  });

  it(`keeps at most ${RECENT_MAX}`, () => {
    const many = Array.from({ length: RECENT_MAX }, (_, i) => `w${i}`);
    const next = addRecent(many, 'new');
    expect(next).toHaveLength(RECENT_MAX);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`w${RECENT_MAX - 1}`);
  });

  it('ignores an empty word', () => {
    expect(addRecent(['كشري'], '   ')).toEqual(['كشري']);
  });
});
