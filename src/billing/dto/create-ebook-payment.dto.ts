import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateEbookPaymentDto {
    @ApiProperty({
        description: 'Ebook purchase amount in USD',
        example: 10,
        minimum: 0.01,
    })
    @IsNumber()
    @Min(0.01)
    amount!: number;

    @ApiProperty({
        description: 'Post ID of the ebook being purchased',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsUUID()
    postId!: string;

    @ApiProperty({
        description: 'Seller user ID who receives 90% of the amount',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsString()
    @IsUUID()
    targetUserId!: string;
}
