import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookController } from './webhook/webhook.controller';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { QrService } from './qr/qr.service';
import { BotService } from './bot/bot.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [WebhookController],
  providers: [WhatsappService, QrService, BotService],
})
export class AppModule {}
