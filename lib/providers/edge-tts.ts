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

// ─── Tone of voice (Sprint A item 4) ─────────────────────────────
// Drives the TTS delivery instruction AND optional script post-processing.
// "polished"       = classic ad voiceover (default)
// "casual"         = friendly conversational
// "gritty"         = raw, direct, no-nonsense
// "ugc-authentic"  = customer-recording-on-iPhone — adds natural ticks
export type VoiceTone = "polished" | "casual" | "gritty" | "ugc-authentic";

const TONE_INSTRUCTIONS: Record<VoiceTone, string> = {
  "polished":       "in a professional, clear, engaging tone suitable for a commercial advertisement",
  "casual":         "in a friendly, warm, conversational tone — like talking to a friend",
  "gritty":         "in a raw, direct, no-nonsense tone with energy and conviction",
  "ugc-authentic":  "as if you're a real customer recording a phone video, slightly hesitant, casual cadence, with natural pauses and small filler words — never sound like a polished announcer",
};

/**
 * Post-process VO text to lean into the tone. For UGC, inject a small number
 * of natural filler words at sentence starts so the TTS engine renders them.
 * Pure function — does not mutate input. Returns text unchanged for other tones.
 */
export function applyToneToText(text: string, tone: VoiceTone | undefined): string {
  if (!tone || tone !== "ugc-authentic") return text;
  // Light touch: lead-in filler on the first sentence + a "honestly" mid-sentence
  // if the script is long enough. Keep it light — mechanical injection sounds awful.
  const trimmed = text.trim();
  if (!trimmed) return text;
  const leadIns = ["Okay so,", "Honestly,", "Look,", "Like,"];
  const pick = leadIns[Math.floor(trimmed.length) % leadIns.length];
  // Lowercase the first letter after the lead-in so it reads naturally.
  const first = trimmed[0].toLowerCase() + trimmed.slice(1);
  return `${pick} ${first}`;
}

export async function generateVoiceover(
  script: string,
  voice: string,
  outputDir: string,
  outputFilename: string = "voiceover.wav",
  tone: VoiceTone = "polished"
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, outputFilename);

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

  const instruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.polished;
  const finalScript = applyToneToText(script, tone);

  // Gemini TTS free tier is 3 requests per minute. Retry on 429 with backoff
  // that respects the server-suggested retryDelay when present, so the user's
  // 4-scene segment-mode batch doesn't die on the 4th call.
  const maxAttempts = 5;
  let lastErr: unknown;
  let result: Awaited<ReturnType<typeof model.generateContent>> | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      result = await model.generateContent(
        `Read the following ad voiceover script ${instruction}:\n\n${finalScript}`
      );
      break;
    } catch (err) {
      lastErr = err;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as { status?: number; errorDetails?: Array<{ "@type"?: string; retryDelay?: string }>; message?: string };
      const is429 = e?.status === 429 || (e?.message ?? "").includes("429");
      if (!is429 || attempt === maxAttempts) throw err;

      // Pull the server-suggested retryDelay (e.g. "9s") if present, otherwise
      // exponential backoff starting at 12s.
      const retryInfo = e.errorDetails?.find((d) => d["@type"]?.endsWith("RetryInfo"));
      const suggested = retryInfo?.retryDelay?.match(/(\d+)s?/)?.[1];
      const waitMs = suggested ? (parseInt(suggested, 10) + 1) * 1000 : Math.min(60_000, 12_000 * attempt);
      console.warn(`[TTS] rate-limited (429), waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 1}/${maxAttempts}`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  if (!result) throw lastErr ?? new Error("TTS failed without specific error");

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
  // Force a .wav extension regardless of what the caller passed (legacy callers
  // pass "voiceover.mp3" but the file is actually WAV).
  const wavPath = outputPath.replace(/\.\w+$/, ".wav");
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
