import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetMarketPlaceEbookDto {
    @ApiProperty({ description: 'User ID (UUID)' })
    @IsUUID()
    userId: string;
}