import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

@Injectable()
export class WhatsappService {
  private readonly http: AxiosInstance;
  private readonly phoneId: string;
  private readonly token: string;

  constructor(config: ConfigService) {
    this.token = config.getOrThrow('WHATSAPP_TOKEN');
    this.phoneId = config.getOrThrow('WHATSAPP_PHONE_NUMBER_ID');
    const version = config.get('GRAPH_API_VERSION', 'v23.0');
    this.http = axios.create({
      baseURL: `https://graph.facebook.com/${version}`,
      headers: { Authorization: `Bearer ${this.token}` },
    });
  }

  async sendText(to: string, body: string): Promise<void> {
    await this.http.post(`/${this.phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body, preview_url: false },
    });
  }

  async sendImage(to: string, mediaId: string, caption?: string): Promise<void> {
    await this.http.post(`/${this.phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { id: mediaId, caption },
    });
  }

  /** Uploads an image and returns the media id to use in sendImage. */
  async uploadMedia(buffer: Buffer, mimeType = 'image/png', filename = 'qr.png'): Promise<string> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', mimeType);
    form.append('file', buffer, { filename, contentType: mimeType });
    const { data } = await this.http.post(`/${this.phoneId}/media`, form, { headers: form.getHeaders() });
    return data.id;
  }

  /** Two steps: resolve the media id to a short-lived URL, then fetch it with the same bearer token. */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    const { data: meta } = await this.http.get(`/${mediaId}`);
    const { data } = await axios.get<ArrayBuffer>(meta.url, {
      headers: { Authorization: `Bearer ${this.token}` },
      responseType: 'arraybuffer',
    });
    return Buffer.from(data);
  }
}
