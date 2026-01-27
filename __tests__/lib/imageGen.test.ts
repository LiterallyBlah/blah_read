import { buildImagePrompt } from '@/lib/imageGen';

describe('imageGen', () => {
  it('builds pixel art prompt from companion data', () => {
    const prompt = buildImagePrompt('Dragon', ['mystical', 'scaled', 'ancient']);
    expect(prompt).toContain('32x32');
    expect(prompt).toContain('pixel art');
    expect(prompt).toContain('Dragon');
    expect(prompt).toContain('mystical');
    expect(prompt).toContain('scaled');
    expect(prompt).toContain('ancient');
  });

  it('includes style keywords for consistent output', () => {
    const prompt = buildImagePrompt('Phoenix', ['fiery', 'noble']);
    expect(prompt).toContain('white background');
    expect(prompt).toContain('retro game style');
    expect(prompt).toContain('centered');
  });

  it('handles single keyword', () => {
    const prompt = buildImagePrompt('Wolf', ['silver']);
    expect(prompt).toContain('Wolf');
    expect(prompt).toContain('silver');
  });
});
