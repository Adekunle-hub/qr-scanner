import { Injectable, Logger } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { QrService } from '../qr/qr.service';

const HELP =
  'Hi! I turn links into QR codes and QR codes into links.\n\n' +
  '• Send a link (e.g. example.com) and I will reply with a QR code.\n' +
  '• Send a photo of a QR code and I will reply with what it says.';

const NOT_FOUND =
  "I couldn't find a QR code in that image. Try a sharper, closer photo with the whole code in frame.";

// Matches "https://x.com/a", "www.x.com", "x.com/path" etc.
const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  // Meta can deliver the same message more than once; remember recent ids.
  private readonly seen = new Set<string>();

  constructor(private readonly wa: WhatsappService, private readonly qr: QrService) {}

  async handle(message: any): Promise<void> {
    if (this.seen.has(message.id)) return;
    this.seen.add(message.id);
    if (this.seen.size > 5000) this.seen.delete(this.seen.values().next().value!);

    const from: string = message.from;

    if (message.type === 'text') {
      const url = BotService.toUrl(message.text?.body ?? '');
      if (!url) return this.wa.sendText(from, HELP);
      const png = await this.qr.encode(url);
      const mediaId = await this.wa.uploadMedia(png);
      return this.wa.sendImage(from, mediaId, url);
    }

    if (message.type === 'image') {
      const image = await this.wa.downloadMedia(message.image.id);
      const text = await this.qr.decode(image);
      if (!text) this.saveFailedScan(image);
      return this.wa.sendText(from, text ? `QR code says:\n${text}` : NOT_FOUND);
    }

    this.logger.log(`Ignoring ${message.type} message from ${from}`);
    return this.wa.sendText(from, HELP);
  }

  /** Keeps images we couldn't read so the decoder can be tuned against real examples. */
  private saveFailedScan(image: Buffer): void {
    const dir = join(process.cwd(), 'failed-scans');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`);
    writeFileSync(file, image);
    this.logger.warn(`No QR code found; saved image to ${file}`);
  }

  /** Returns a normalised https URL, or null if the text isn't a link. */
  static toUrl(input: string): string | null {
    const text = input.trim();
    if (!URL_RE.test(text)) return null;
    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  }
}
