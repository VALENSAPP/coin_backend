import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { DashboardPaginationDto } from './dashboard-pagination.dto';

export class DashboardItemsQueryDto extends DashboardPaginationDto {
    @ApiPropertyOptional({ example: 'Shoes' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({ example: true })
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
