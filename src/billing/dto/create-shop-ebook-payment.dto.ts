import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateShopEbookPaymentDto {
    @ApiProperty({
        description: 'Shop ebook purchase amount in USD',
        example: 19.99,
        minimum: 0.01,
    })
    @IsNumber()
    @Min(0.01)
    amount!: number;

    @ApiProperty({
        description: 'Closet ID of the ebook seller',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsUUID()
    closetId!: string;

    @ApiProperty({
        description: 'Shop ebook ID being purchased',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsUUID()
    ebookId!: string;
}
