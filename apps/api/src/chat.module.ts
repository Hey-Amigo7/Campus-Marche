import { Global, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

/**
 * Global WebSocket gateway module.
 * ChatGateway is available for injection in every feature module
 * without needing to import this module explicitly.
 * JwtService is provided globally via AppModule's JwtModule (global: true).
 */
@Global()
@Module({
  providers: [ChatGateway],
  exports:   [ChatGateway],
})
export class ChatModule {}
