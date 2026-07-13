import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddWishlistItemDto {
    @ApiProperty({ example: 'a8a8f662-2c8a-4745-a130-d53f2f0d528a' })
    @IsString()
    productId!: string;
}
