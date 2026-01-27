import { parseModelsResponse, supportsImageOutput } from '@/lib/openrouter';

describe('openrouter', () => {
  it('parses models response', () => {
    const response = {
      data: [
        { id: 'model-1', name: 'Model 1', architecture: { output_modalities: ['text'] } },
        { id: 'model-2', name: 'Model 2', architecture: { output_modalities: ['text', 'image'] } },
      ],
    };
    const models = parseModelsResponse(response);
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('model-1');
  });

  it('detects image output support', () => {
    const imageModel = { id: 'x', name: 'x', outputModalities: ['text', 'image'] };
    const textModel = { id: 'y', name: 'y', outputModalities: ['text'] };
    expect(supportsImageOutput(imageModel)).toBe(true);
    expect(supportsImageOutput(textModel)).toBe(false);
  });
});
