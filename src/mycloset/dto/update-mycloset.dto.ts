import { PartialType } from '@nestjs/swagger';
import { CreateMyclosetDto } from './create-mycloset.dto';

export class UpdateMyclosetDto extends PartialType(CreateMyclosetDto) {}
