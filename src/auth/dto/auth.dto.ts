import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MonMotDePasse123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'JohnDoe' })
  @IsString()
  @MinLength(2)
  displayName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MonMotDePasse123' })
  @IsString()
  password: string;
}
