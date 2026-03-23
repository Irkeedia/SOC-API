import { Global, Module } from '@nestjs/common';
import { SecurityLoggerService } from './services/security-logger.service';
import { EmailService } from './services/email.service';
import { UploadService } from './services/upload.service';

@Global()
@Module({
  providers: [SecurityLoggerService, EmailService, UploadService],
  exports: [SecurityLoggerService, EmailService, UploadService],
})
export class CommonModule {}
