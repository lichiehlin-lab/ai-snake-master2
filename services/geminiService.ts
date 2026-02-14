
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static aiInstance: any = null;

  private static getAI() {
    if (!this.aiInstance) {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        console.warn("警告：未偵測到 API_KEY 環境變數");
      }
      this.aiInstance = new GoogleGenAI({ apiKey: apiKey || '' });
    }
    return this.aiInstance;
  }

  static async generateThemeImage(prompt: string, currentImageBase64?: string): Promise<string> {
    const ai = this.getAI();
    const model = 'gemini-2.5-flash-image';

    const parts: any[] = [{ text: `Generate a high-quality game background texture for a snake game. Style should be futuristic and clean. Prompt: ${prompt}` }];
    
    if (currentImageBase64) {
      parts.push({
        inlineData: {
          data: currentImageBase64.split(',')[1],
          mimeType: 'image/png'
        }
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts }
    });

    const candidates = response.candidates || [];
    for (const part of candidates[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Gemini 未傳回任何影像數據");
  }

  static async generateVeoVideo(prompt: string, startImageBase64: string): Promise<string> {
    const ai = this.getAI();
    const apiKey = process.env.API_KEY;
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'Cyberpunk snake moving dynamically',
      image: {
        imageBytes: startImageBase64.split(',')[1],
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("影片生成失敗");

    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}
