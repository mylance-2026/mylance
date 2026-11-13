"use client";

/**
 * On-device translation using the browser's built-in Translator and LanguageDetector APIs
 * (currently Chromium-based browsers). No server, key or data leaves the device.
 * Where unsupported, callers show an honest "not available" state; a server translation
 * provider can replace this later behind the same two functions.
 */
interface TranslatorInstance { translate(text: string): Promise<string> }
interface TranslatorStatic {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(o: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorInstance>;
}
interface DetectorInstance { detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]> }
interface DetectorStatic { create(): Promise<DetectorInstance> }

const g = () => globalThis as unknown as { Translator?: TranslatorStatic; LanguageDetector?: DetectorStatic };

export const LANGUAGES: [string, string][] = [
  ["en", "English"], ["hi", "Hindi"], ["bn", "Bengali"], ["ta", "Tamil"], ["te", "Telugu"], ["mr", "Marathi"],
  ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["pt", "Portuguese"], ["it", "Italian"],
  ["ru", "Russian"], ["ar", "Arabic"], ["zh", "Chinese"], ["ja", "Japanese"], ["ko", "Korean"], ["tr", "Turkish"], ["id", "Indonesian"],
];

export const translationSupported = () => typeof globalThis !== "undefined" && !!g().Translator && !!g().LanguageDetector;

let detector: Promise<DetectorInstance> | null = null;
const translators = new Map<string, Promise<TranslatorInstance>>();

export type Translation = { kind: "same" } | { kind: "ok"; text: string; from: string };

/** Throws if translation is unavailable for this language pair. */
export async function translateText(text: string, target: string): Promise<Translation> {
  try {
    return await translate(text, target);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/model|download|not available|NotSupported/i.test(msg) && !/^Translating|^Could not/.test(msg)) throw new Error("The on-device translation model is not available in this browser yet.");
    throw e;
  }
}

async function translate(text: string, target: string): Promise<Translation> {
  const api = g();
  if (!api.Translator || !api.LanguageDetector) throw new Error("Translation is not available in this browser.");
  detector ??= api.LanguageDetector.create();
  const found = (await (await detector).detect(text))[0];
  const from = found?.detectedLanguage;
  if (!from || from === "und" || found.confidence < 0.4) throw new Error("Could not detect the language.");
  if (from === target) return { kind: "same" };
  const pair = { sourceLanguage: from, targetLanguage: target };
  if ((await api.Translator.availability(pair)) === "unavailable") throw new Error(`Translating ${from} to ${target} is not supported here.`);
  const key = `${from}>${target}`;
  if (!translators.has(key)) translators.set(key, api.Translator.create(pair));
  try {
    return { kind: "ok", text: await (await translators.get(key)!).translate(text), from };
  } catch (e) {
    translators.delete(key);
    throw e;
  }
}
