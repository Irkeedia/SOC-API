import { Global, Module } from '@nestjs/common';
import { SecurityLoggerService } from './services/security-logger.service';
import { EmailService } from './services/email.service';

@Global()
@Module({
  providers: [SecurityLoggerService, EmailService],
  exports: [SecurityLoggerService, EmailService],
})
export class CommonModule {}
