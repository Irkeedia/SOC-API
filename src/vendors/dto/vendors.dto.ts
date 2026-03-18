import { IsString, IsOptional, IsUrl, MaxLength, IsNumber, Min, Max } from 'class-validator';

export class CreateVendorApplicationDto {
  @IsString()
  @MaxLength(200)
  businessName: string;

  @IsString()
  @MaxLength(200)
  businessEmail: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  country?: string;
}

export class UpdateVendorProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  businessName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;
}

export class CreateVendorProductDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  shortDesc?: string;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  compareAtPrice?: number;

  @IsString()
  @MaxLength(50)
  category: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stockQty?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  shippingInfo?: string;
}

export class UpdateVendorProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  shortDesc?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  compareAtPrice?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stockQty?: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  shippingInfo?: string;
}

export class AdminReviewVendorDto {
  @IsString()
  action: 'APPROVED' | 'REJECTED' | 'SUSPENDED';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

export class AdminReviewProductDto {
  @IsString()
  action: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  rejectionNote?: string;
}
