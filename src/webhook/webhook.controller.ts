import { Controller, ForbiddenException, Get, Headers, HttpCode, Logger, Post, Query, Req, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BotService } from '../bot/bot.service';
import { isValidSignature } from './signature';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly config: ConfigService, private readonly bot: BotService) {}

  /** Meta calls this once when you click "Verify and save" in the dashboard. */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (mode === 'subscribe' && token === this.config.get('WEBHOOK_VERIFY_TOKEN')) {
      this.logger.log('Webhook verified by Meta');
      return challenge;
    }
    this.logger.warn('Webhook verification failed: verify token mismatch');
    throw new ForbiddenException('Verify token mismatch');
  }

  /** Every incoming message (and delivery status update) lands here. */
  @Post()
  @HttpCode(200)
  receive(@Req() req: RawBodyRequest<Request>, @Headers('x-hub-signature-256') signature: string): string {
    this.logger.log('Webhook call received from Meta');
    const secret = this.config.getOrThrow<string>('META_APP_SECRET');
    if (!isValidSignature(req.rawBody, signature, secret)) {
      this.logger.warn('Rejected webhook call with a bad signature (check META_APP_SECRET in .env)');
      throw new ForbiddenException('Bad signature');
    }

    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (value?.statuses) this.logger.log(`Status update: ${value.statuses[0]?.status}`);
    if (message) {
      this.logger.log(`Incoming ${message.type} message from ${message.from}`);
      // Answer 200 right away; Meta retries if we take too long.
      setImmediate(() => this.bot.handle(message).catch((err) => this.logger.error(err?.response?.data ?? err)));
    }
    return 'OK';
  }
}
