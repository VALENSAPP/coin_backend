import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddPrivateCircleMembersDto {
  @ApiProperty({ type: [String], description: 'User IDs to add to the private circle' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }: { value: any }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((item: string) => item.trim()).filter(Boolean);
      }
    }
    return [];
  })
  userIds!: string[];
}
