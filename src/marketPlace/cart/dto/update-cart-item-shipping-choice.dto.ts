import { ApiProperty } from '@nestjs/swagger';
import { CartItemShippingChoice } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCartItemShippingChoiceDto {
    @ApiProperty({ enum: CartItemShippingChoice, example: CartItemShippingChoice.ship_items })
    @IsEnum(CartItemShippingChoice)
    shippingChoice!: CartItemShippingChoice;
}
