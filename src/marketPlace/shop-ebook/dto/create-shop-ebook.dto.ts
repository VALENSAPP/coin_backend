import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateShopEbookDto {
    @ApiProperty({ example: '9d0fbfa2-2abc-453f-ac79-64ff5e58f633' })
    @IsString()
    closetId!: string;

    @ApiPropertyOptional({ example: 'My first ebook' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined || value === '') return null;
        return String(value).trim();
    })
    caption?: string | null;

    @ApiPropertyOptional({ example: 'Complete guide content summary' })
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined || value === '') return null;
        return String(value).trim();
    })
    text?: string | null;

    @ApiProperty({ example: 19.99, minimum: 0 })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    amount!: number;

    @ApiPropertyOptional({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
        return Boolean(value);
    })
    isDownload?: boolean;

    @ApiPropertyOptional({ example: 'SUMMER10' })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    @Transform(({ value }: { value: any }) => {
        if (value === null || value === undefined || value === '') return null;
        return String(value).trim();
    })
    promoCode?: string | null;

    @ApiPropertyOptional({ type: [String], example: ['Chapter 1', 'Chapter 2'] })
    @IsOptional()
    @IsArray()
    @Transform(({ value }: { value: any }) => {
        if (value === '' || value === null || value === undefined) return [];
        if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);

        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.map((item) => String(item).trim()).filter(Boolean);
                }
            } catch {
                return value.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            return [value.trim()].filter(Boolean);
        }

        return [];
    })
    tableContent?: string[];
}
