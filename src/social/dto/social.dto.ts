import { IsString, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  dollId: string;

  @ApiProperty({ example: 'Superbe entretien, elle est magnifique !' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  content: string;
}

export class VoteAdviceDto {
  @ApiProperty({ description: 'ID de l\'utilisateur dont on note les conseils' })
  @IsString()
  receiverId: string;

  @ApiProperty({ example: 4, description: 'Score de 1 à 5' })
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;
}
