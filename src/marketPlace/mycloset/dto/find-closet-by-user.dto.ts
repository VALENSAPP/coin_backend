import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class FindClosetByUserDto {
    @ApiProperty({ example: 'cm8x8z2p10000l6g6h4d8kq91' })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }: { value: any }) => String(value || '').trim())
    userId!: string;
}
