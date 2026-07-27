/**
 * Whisper Subtitle Generator
 * 
 * Uses faster-whisper for local transcription
 * + DeepL/Google Translate for Persian translation
 * 
 * Install: pip install faster-whisper deep-translator
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Extract audio from video using FFmpeg
 */
export async function extractAudio(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
      '-f', 'wav',
      outputPath,
      '-y'
    ]);
    ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg failed: ${code}`)));
  });
}

/**
 * Transcribe audio with faster-whisper (Python)
 */
export async function transcribeWithWhisper(audioPath: string): Promise<SubtitleSegment[]> {
  const script = `
import sys
from faster_whisper import WhisperModel

model = WhisperModel("medium", device="cpu", compute_type="int8")
segments, info = model.transcribe("${audioPath}", beam_size=5)

for seg in segments:
    print(f"{seg.start}|{seg.end}|{seg.text.strip()}")
`;
  
  const result = await runPythonScript(script);
  
  return result.split('\n').filter(Boolean).map(line => {
    const [start, end, ...textParts] = line.split('|');
    return {
      start: parseFloat(start),
      end: parseFloat(end),
      text: textParts.join('|'),
    };
  });
}

/**
 * Translate text to Persian using deep-translator
 */
export async function translateToPersian(texts: string[]): Promise<string[]> {
  const script = `
from deep_translator import GoogleTranslator
translator = GoogleTranslator(source='auto', target='fa')
for line in ${JSON.stringify(texts)}:
    print(translator.translate(line))
`;
  const result = await runPythonScript(script);
  return result.split('\n');
}

/**
 * Generate SRT file from segments
 */
export function generateSRT(segments: SubtitleSegment[]): string {
  return segments.map((seg, i) => {
    const start = formatSRTTime(seg.start);
    const end = formatSRTTime(seg.end);
    return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
  }).join('\n');
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

async function runPythonScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['-c', script]);
    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.on('close', (code) => code === 0 ? resolve(output.trim()) : reject(new Error('Python script failed')));
  });
}
