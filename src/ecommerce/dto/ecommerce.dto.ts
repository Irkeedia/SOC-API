import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, Min, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Solution Nettoyante SOC 500ml' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL d\'image invalide' })
  imageUrl?: string;

  @ApiProperty({ example: 'nettoyage' })
  @IsString()
  @MaxLength(50)
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  stockQty?: number;
}

class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ example: '12 rue de la Paix, 75002 Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  shippingAddress?: string;

  @ApiPropertyOptional({ default: true, description: 'Livraison discrète (emballage neutre)' })
  @IsOptional()
  @IsBoolean()
  isDiscreet?: boolean;
}
