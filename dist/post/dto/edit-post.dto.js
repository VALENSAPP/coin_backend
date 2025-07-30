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
exports.EditPostDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class EditPostDto {
    text;
    caption;
    hashtag;
    location;
    music;
    taggedPeople;
    images;
}
exports.EditPostDto = EditPostDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Text content of the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EditPostDto.prototype, "text", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Caption for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EditPostDto.prototype, "caption", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Hashtags for the post', required: false, isArray: true, type: String }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === '' || value === null || value === undefined)
            return [];
        if (Array.isArray(value))
            return value;
        if (typeof value === 'string')
            return value.split(',').filter(item => item.trim() !== '');
        return [value];
    }),
    __metadata("design:type", Array)
], EditPostDto.prototype, "hashtag", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Location for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EditPostDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Music for the post', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EditPostDto.prototype, "music", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tagged people user IDs', required: false, isArray: true, type: String }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === '' || value === null || value === undefined)
            return [];
        if (Array.isArray(value))
            return value;
        if (typeof value === 'string')
            return value.split(',').filter(item => item.trim() !== '');
        return [value];
    }),
    __metadata("design:type", Array)
], EditPostDto.prototype, "taggedPeople", void 0);
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
], EditPostDto.prototype, "images", void 0);
//# sourceMappingURL=edit-post.dto.js.map