"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePostDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CreatePostDto {
    text;
    caption;
    hashtag;
    location;
    music;
    link;
    visibleTo;
    taggedPeople;
    images;
    type;
    raiseAmount;
    start_time;
    end_time;
}
exports.CreatePostDto = CreatePostDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Text content of the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value && value.trim() !== '' ? value : null),
    __metadata("design:type", String)
], CreatePostDto.prototype, "text", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Caption for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value && value.trim() !== '' ? value : null),
    __metadata("design:type", String)
], CreatePostDto.prototype, "caption", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hashtags for the post', required: false, isArray: true, type: String }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (!value)
            return [];
        if (Array.isArray(value))
            return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch {
                return value.split(',').map((s) => s.trim()).filter(Boolean);
            }
        }
        return [];
    }),
    __metadata("design:type", Array)
], CreatePostDto.prototype, "hashtag", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Location for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value && value.trim() !== '' ? value : null),
    __metadata("design:type", String)
], CreatePostDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Music for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value && value.trim() !== '' ? value : null),
    __metadata("design:type", String)
], CreatePostDto.prototype, "music", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Link for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value && value.trim() !== '' ? value : null),
    __metadata("design:type", String)
], CreatePostDto.prototype, "link", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Visibility setting for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value && value.trim() !== '' ? value : null),
    __metadata("design:type", String)
], CreatePostDto.prototype, "visibleTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tagged people user IDs', required: false, isArray: true, type: String }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (!value)
            return [];
        if (Array.isArray(value))
            return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch {
                return value.split(',').map((s) => s.trim()).filter(Boolean);
            }
        }
        return [];
    }),
    __metadata("design:type", Array)
], CreatePostDto.prototype, "taggedPeople", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Array of image files', required: false, type: 'string', format: 'binary', isArray: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === '' || value === null || value === undefined)
            return [];
        if (Array.isArray(value))
            return value;
        return [value];
    }),
    __metadata("design:type", Array)
], CreatePostDto.prototype, "images", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Type of post (normal or crowdfunding)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Raise amount for crowdfunding posts', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value ? parseFloat(value) : null),
    __metadata("design:type", Number)
], CreatePostDto.prototype, "raiseAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Start time for crowdfunding posts', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value ? new Date(value) : null),
    __metadata("design:type", Date)
], CreatePostDto.prototype, "start_time", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'End time for crowdfunding posts', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value ? new Date(value) : null),
    __metadata("design:type", Date)
], CreatePostDto.prototype, "end_time", void 0);
//# sourceMappingURL=create-post.dto.js.map