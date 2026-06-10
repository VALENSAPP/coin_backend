import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import ffmpeg = require('fluent-ffmpeg');
import { Express } from 'express';
const ffmpegStatic = require('ffmpeg-static');

export type VideoTextOverlayItem = {
    text: string;
    xPercent: number;
    yPercent: number;
    fontSize: number;
    color: string;
};

const resolvedFfmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
if (resolvedFfmpegPath) {
    ffmpeg.setFfmpegPath(resolvedFfmpegPath);
}

const DEFAULT_FONT_CANDIDATES = [
    process.env.FFMPEG_FONT_FILE,
    'C:/Windows/Fonts/arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
].filter(Boolean) as string[];

async function resolveFontFile(): Promise<string | null> {
    for (const candidate of DEFAULT_FONT_CANDIDATES) {
        try {
            await fs.access(candidate);
            return candidate;
        } catch {
            continue;
        }
    }
    return null;
}

function clampPercent(value: number): number {
    if (Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function sanitizeColor(color: string): string {
    const trimmed = (color || '').trim();
    if (!trimmed) return 'white';

    const namedColor = /^[a-zA-Z]+$/;
    const hexColor = /^#?[0-9a-fA-F]{3,8}$/;

    if (namedColor.test(trimmed)) return trimmed;
    if (hexColor.test(trimmed)) return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

    return 'white';
}

function escapeDrawTextValue(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'")
        .replace(/,/g, '\\,')
        .replace(/%/g, '\\%')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}

function toFfmpegPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

function buildDrawTextFilter(items: VideoTextOverlayItem[], fontFile?: string | null): string {
    return items
        .map((item) => {
            const text = escapeDrawTextValue((item.text || '').trim());
            const xPercent = clampPercent(Number(item.xPercent));
            const yPercent = clampPercent(Number(item.yPercent));
            const fontSize = Number(item.fontSize) || 24;
            const color = sanitizeColor(item.color);

            const base = [
                'drawtext=',
                fontFile ? `fontfile='${escapeDrawTextValue(fontFile)}'` : null,
                `text='${text}'`,
                `x=(w-text_w)*${xPercent}`,
                `y=(h-text_h)*${yPercent}`,
                `fontsize=${fontSize}`,
                `fontcolor=${color}`,
                'box=1',
                'boxcolor=black@0.35',
                'boxborderw=8',
            ].filter(Boolean);

            const [head, ...rest] = base;
            return `${head}${rest.join(':')}`;
        })
        .join(',');
}

export async function applyVideoTextOverlays(
    file: Express.Multer.File,
    items: VideoTextOverlayItem[],
): Promise<Express.Multer.File> {
    if (!file?.buffer || !file?.mimetype?.startsWith('video/')) {
        throw new Error('Video file is required for text overlay rendering');
    }

    if (!items.length) {
        return file;
    }

    const id = randomUUID();
    const inputExt = path.extname(file.originalname) || '.mp4';
    const inputPath = path.join(os.tmpdir(), `valens-video-text-input-${id}${inputExt}`);
    const outputPath = path.join(os.tmpdir(), `valens-video-text-output-${id}.mp4`);

    await fs.writeFile(inputPath, file.buffer);

    try {
        const fontFile = await resolveFontFile();
        const filter = buildDrawTextFilter(items, fontFile);
        const ffmpegInputPath = toFfmpegPath(inputPath);
        const ffmpegOutputPath = toFfmpegPath(outputPath);

        const runRender = (copyAudio: boolean) => new Promise<void>((resolve, reject) => {
            const cmd = ffmpeg(ffmpegInputPath)
                .outputOptions([
                    '-y',
                    '-preset veryfast',
                    '-crf 22',
                    '-pix_fmt yuv420p',
                    '-movflags +faststart',
                ])
                .videoCodec('libx264')
                .videoFilter(filter)
                .output(ffmpegOutputPath)
                .on('end', () => resolve())
                .on('error', (error, _stdout, stderr) => {
                    reject(new Error(`${error.message}\n${stderr || ''}`));
                });

            if (copyAudio) {
                cmd.audioCodec('aac');
            } else {
                cmd.noAudio();
            }

            cmd.run();
        });

        try {
            await runRender(true);
        } catch (firstError) {
            // Fallback with no audio for codecs/containers that reject AAC remuxing.
            await runRender(false).catch((fallbackError) => {
                throw new Error(`Video text overlay failed. First attempt: ${(firstError as Error).message}. Fallback attempt: ${(fallbackError as Error).message}`);
            });
        }

        const buffer = await fs.readFile(outputPath);

        return {
            ...file,
            buffer,
            size: buffer.length,
            mimetype: 'video/mp4',
            originalname: `${path.parse(file.originalname).name}-text.mp4`,
        };
    } finally {
        await fs.unlink(inputPath).catch(() => undefined);
        await fs.unlink(outputPath).catch(() => undefined);
    }
}
