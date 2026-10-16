import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import jsQR from 'jsqr';
import sharp from 'sharp';

type Prepare = (img: sharp.Sharp) => sharp.Sharp;

// Each pass cleans the image a bit more, so clean screenshots decode fast and phone photos still have a chance.
const ATTEMPTS: Prepare[] = [
  (img) => img.resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }),
  (img) => img.resize({ width: 1000, height: 1000, fit: 'inside' }).grayscale().normalize(),
  (img) => img.resize({ width: 1200, height: 1200, fit: 'inside' }).grayscale().normalize().sharpen().threshold(128),
  (img) => img.resize({ width: 600, height: 600, fit: 'inside' }).grayscale().normalize(),
];

/** jsQR only accepts RGBA, but sharp returns 1-4 channels depending on the image and the grayscale step. */
function toRgba(data: Buffer, channels: number): Uint8ClampedArray {
  const pixelCount = data.length / channels;
  const out = new Uint8ClampedArray(pixelCount * 4);
  for (let i = 0; i < pixelCount; i++) {
    const src = i * channels;
    const grey = channels < 3;
    out[i * 4] = data[src];
    out[i * 4 + 1] = grey ? data[src] : data[src + 1];
    out[i * 4 + 2] = grey ? data[src] : data[src + 2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

@Injectable()
export class QrService {
  encode(text: string): Promise<Buffer> {
    return QRCode.toBuffer(text, { type: 'png', width: 600, margin: 2, errorCorrectionLevel: 'M' });
  }

  /** Returns the QR payload, or null if no code is found. */
  async decode(image: Buffer): Promise<string | null> {
    for (const prepare of ATTEMPTS) {
      const { data, info } = await prepare(sharp(image).rotate())
        .raw()
        .toBuffer({ resolveWithObject: true });
      const pixels = toRgba(data, info.channels);
      const result = jsQR(pixels, info.width, info.height, { inversionAttempts: 'attemptBoth' });
      if (result?.data) return result.data;
    }
    return null;
  }
}
