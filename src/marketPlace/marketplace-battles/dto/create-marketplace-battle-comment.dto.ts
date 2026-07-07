import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMarketplaceBattleCommentDto {
    @ApiProperty({
        description: 'Marketplace battle comment text',
        example: 'I prefer the first product',
        maxLength: 1000,
    })
    @IsString()
    @Transform(({ value }: { value: any }) => String(value ?? '').trim())
    @IsNotEmpty()
    @MaxLength(1000)
    comment!: string;
}
