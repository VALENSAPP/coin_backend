import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class AddCartItemDto {
    @ApiProperty({ example: 'a8a8f662-2c8a-4745-a130-d53f2f0d528a' })
    @IsString()
    productId!: string;

    @ApiProperty({ example: 1, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;
}
