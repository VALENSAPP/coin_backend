import { PartialType } from '@nestjs/swagger';
import { CreateClosetItemDto } from './create-closet-item.dto';

export class UpdateClosetItemDto extends PartialType(CreateClosetItemDto) {}
