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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const token_service_1 = require("./token.service");
const create_token_dto_1 = require("./dto/create-token.dto");
const passport_1 = require("@nestjs/passport");
let TokenController = class TokenController {
    tokenService;
    constructor(tokenService) {
        this.tokenService = tokenService;
    }
    async createToken(dto, req) {
        const userId = req.user.userId;
        const result = await this.tokenService.createTokenForUser(dto.userId);
        return {
            message: 'Token created successfully',
            ...result
        };
    }
};
exports.TokenController = TokenController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a token for a user',
        description: 'Creates a new token on BSC blockchain using the user\'s name. Only authenticated users can create tokens.'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Token created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                transactionHash: { type: 'string', example: '0x...' },
                tokenAddress: { type: 'string', example: '0x...' },
                tokenName: { type: 'string', example: 'vishalValens' },
                tokenSymbol: { type: 'string', example: 'vishalValens' },
                initialSupply: { type: 'string', example: '1000000000000000000000000' },
                initialPrice: { type: 'string', example: '100000000000000' },
                scalingConstant: { type: 'string', example: '100000000000000' },
                blockNumber: { type: 'number', example: 12345678 }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.BAD_REQUEST,
        description: 'Bad request - User not found or missing username'
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid or missing JWT token'
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_token_dto_1.CreateTokenDto, Object]),
    __metadata("design:returntype", Promise)
], TokenController.prototype, "createToken", null);
exports.TokenController = TokenController = __decorate([
    (0, swagger_1.ApiTags)('token'),
    (0, common_1.Controller)('token'),
    __metadata("design:paramtypes", [token_service_1.TokenService])
], TokenController);
//# sourceMappingURL=token.controller.js.map