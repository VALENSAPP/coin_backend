import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EditMarketplaceBattleQuestionDto {
    @ApiProperty({
        description: 'Updated shop battle question',
        example: 'Which product has better style for this season?',
    })
    @IsString()
    @Transform(({ value }: { value: any }) => String(value ?? '').trim())
    @IsNotEmpty({ message: 'Question cannot be empty' })
    @MaxLength(500)
    question!: string;
}
