import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @MaxLength(120)
    fullName!: string;

    @ApiProperty({ example: '+919999999999' })
    @IsString()
    @MaxLength(30)
    phoneNumber!: string;

    @ApiProperty({ required: false, example: '+918888888888' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    alternateNumber?: string;

    @ApiProperty({ example: '221B Baker Street' })
    @IsString()
    @MaxLength(255)
    addressLine1!: string;

    @ApiProperty({ required: false, example: 'Near Central Park' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine2?: string;

    @ApiProperty({ example: 'London' })
    @IsString()
    @MaxLength(100)
    city!: string;

    @ApiProperty({ example: 'Greater London' })
    @IsString()
    @MaxLength(100)
    state!: string;

    @ApiProperty({ example: 'United Kingdom' })
    @IsString()
    @MaxLength(100)
    country!: string;

    @ApiProperty({ example: 'NW16XE' })
    @IsString()
    @MaxLength(20)
    postalCode!: string;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
