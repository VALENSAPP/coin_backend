import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('address')
@Controller('address')
export class AddressController {
    constructor(private readonly addressService: AddressService) { }

    @Post('addAddress')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add new address for authenticated user' })
    async addAddress(
        @Req() req: Request,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateAddressDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.addressService.addAddress(userId, dto);
    }

    @Get('getAddress')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get authenticated user addresses' })
    async getAddress(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.addressService.getAddress(userId);
    }

    @Patch('updateAddress/:addressId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'addressId', type: 'string' })
    @ApiOperation({ summary: 'Update authenticated user address' })
    async updateAddress(
        @Req() req: Request,
        @Param('addressId') addressId: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateAddressDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.addressService.updateAddress(userId, addressId, dto);
    }

    @Delete('deleteAddress/:addressId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'addressId', type: 'string' })
    @ApiOperation({ summary: 'Delete authenticated user address' })
    async deleteAddress(@Req() req: Request, @Param('addressId') addressId: string) {
        const userId = (req.user as any)?.userId;
        return this.addressService.deleteAddress(userId, addressId);
    }

    @Patch('makeAddressDefault/:addressId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'addressId', type: 'string' })
    @ApiOperation({ summary: 'Make an address default for authenticated user' })
    async makeAddressDefault(@Req() req: Request, @Param('addressId') addressId: string) {
        const userId = (req.user as any)?.userId;
        return this.addressService.makeAddressDefault(userId, addressId);
    }
}
