import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import fs from "fs/promises";

// Voice presets mapped to Gemini TTS voice names
const VOICE_PRESETS: Record<string, string> = {
  professional: "Kore",
  energetic: "Puck",
  luxury: "Charon",
  warm: "Zephyr",
  motivational: "Kore",
  calm: "Zephyr",
};

export function pickVoice(musicDirection: string): string {
  const lower = musicDirection.toLowerCase();
  for (const [key, voice] of Object.entries(VOICE_PRESETS)) {
    if (lower.includes(key)) return voice;
  }
  return "Kore";
}

export async function generateVoiceover(
  script: string,
  voice: string,
  outputDir: string
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "voiceover.mp3");

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-tts",
    generationConfig: {
      responseModalities: ["AUDIO"] as unknown as undefined,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    } as Record<string, unknown>,
  });

  const result = await model.generateContent(
    `Read the following ad voiceover script in a professional, clear, engaging tone suitable for a commercial advertisement:\n\n${script}`
  );

  const audioData = result.response.candidates?.[0]?.content?.parts?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inlineData = (audioData as any)?.inlineData;
  if (!inlineData?.data) {
    throw new Error("No audio data returned from Gemini TTS");
  }

  // Gemini returns base64-encoded PCM audio, decode it
  const audioBuffer = Buffer.from(inlineData.data, "base64");

  // Gemini TTS returns raw PCM — wrap it in a WAV container
  const wavBuffer = pcmToWav(audioBuffer, 24000, 1, 16);
  const wavPath = outputPath.replace(/\.mp3$/, ".wav");
  await fs.writeFile(wavPath, wavBuffer);

  return wavPath;
}

function pcmToWav(pcmData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);

  return buffer;
}
