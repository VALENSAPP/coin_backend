import { PartialType } from '@nestjs/swagger';
import { CreatePostMessageDto } from './create-post-message.dto';

export class UpdatePostMessageDto extends PartialType(CreatePostMessageDto) {}
