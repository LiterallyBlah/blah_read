const API_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  outputModalities: string[];
}

interface OpenRouterApiResponse {
  data: Array<{
    id: string;
    name: string;
    architecture?: {
      output_modalities?: string[];
    };
  }>;
}

export function parseModelsResponse(response: OpenRouterApiResponse): OpenRouterModel[] {
  return (response.data || []).map((m) => ({
    id: m.id,
    name: m.name,
    outputModalities: m.architecture?.output_modalities || ['text'],
  }));
}

export function supportsImageOutput(model: OpenRouterModel): boolean {
  return model.outputModalities.includes('image');
}

export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch(`${API_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error('Failed to fetch models');
  return parseModelsResponse(await response.json());
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await fetchModels(apiKey);
    return true;
  } catch {
    return false;
  }
}

export async function validateImageModel(apiKey: string, modelId: string): Promise<boolean> {
  const models = await fetchModels(apiKey);
  const model = models.find(m => m.id === modelId);
  return model ? supportsImageOutput(model) : false;
}
