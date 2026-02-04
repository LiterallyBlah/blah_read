import { buildImagePrompt, ImageGenConfig } from '@/lib/shared';

describe('imageGen', () => {
  describe('ImageGenConfig', () => {
    it('accepts imageSize parameter', () => {
      const config: ImageGenConfig = {
        model: 'test-model',
        imageSize: '2K',
      };
      expect(config.imageSize).toBe('2K');
    });
  });

  describe('buildImagePrompt', () => {
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

    it('joins multiple keywords with commas', () => {
      const prompt = buildImagePrompt('Cat', ['fluffy', 'orange', 'sleepy']);
      expect(prompt).toContain('fluffy, orange, sleepy');
    });
  });

  describe('OpenRouter API format', () => {
    it('expects response with images array', () => {
      // This tests the expected response format from OpenRouter
      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Here is your image',
            images: [{
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,abc123',
              },
            }],
          },
        }],
      };

      const imageUrl = mockResponse.choices[0].message.images?.[0].image_url.url;
      expect(imageUrl).toBe('data:image/png;base64,abc123');
    });
  });
});
