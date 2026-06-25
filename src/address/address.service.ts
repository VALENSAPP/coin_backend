import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
    constructor(private readonly prisma: PrismaService) { }

    private async ensureUserExists(userId: string) {
        if (!userId) throw new BadRequestException('User ID required');

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) throw new NotFoundException('User not found');
    }

    private async findAddressOrThrow(userId: string, addressId: string) {
        if (!addressId) throw new BadRequestException('Address ID required');

        const address = await this.prisma.userAddrees.findFirst({
            where: {
                id: addressId,
                userId,
            },
        });

        if (!address) throw new NotFoundException('Address not found');
        return address;
    }

    async addAddress(userId: string, dto: CreateAddressDto) {
        await this.ensureUserExists(userId);

        const count = await this.prisma.userAddrees.count({
            where: { userId },
        });

        const shouldBeDefault = count === 0 || dto.isDefault === true;

        const createdAddress = await this.prisma.$transaction(async (tx) => {
            if (shouldBeDefault) {
                await tx.userAddrees.updateMany({
                    where: { userId },
                    data: { isDefault: false },
                });
            }

            return tx.userAddrees.create({
                data: {
                    userId,
                    fullName: dto.fullName,
                    phoneNumber: dto.phoneNumber,
                    alternateNumber: dto.alternateNumber,
                    addressLine1: dto.addressLine1,
                    addressLine2: dto.addressLine2,
                    city: dto.city,
                    state: dto.state,
                    country: dto.country,
                    postalCode: dto.postalCode,
                    isDefault: shouldBeDefault,
                },
            });
        });

        return {
            message: 'Address added successfully',
            address: createdAddress,
        };
    }

    async getAddress(userId: string) {
        await this.ensureUserExists(userId);

        const addresses = await this.prisma.userAddrees.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });

        return {
            count: addresses.length,
            addresses,
        };
    }

    async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
        await this.ensureUserExists(userId);
        const existingAddress = await this.findAddressOrThrow(userId, addressId);

        const { isDefault, ...rest } = dto;
        const hasUpdateFields = Object.keys(rest).length > 0;

        if (!hasUpdateFields && isDefault !== true) {
            throw new BadRequestException('No data provided for update');
        }

        const updatedAddress = await this.prisma.$transaction(async (tx) => {
            if (isDefault === true) {
                await tx.userAddrees.updateMany({
                    where: { userId },
                    data: { isDefault: false },
                });
            }

            return tx.userAddrees.update({
                where: { id: existingAddress.id },
                data: {
                    ...(rest.fullName !== undefined && { fullName: rest.fullName }),
                    ...(rest.phoneNumber !== undefined && { phoneNumber: rest.phoneNumber }),
                    ...(rest.alternateNumber !== undefined && { alternateNumber: rest.alternateNumber }),
                    ...(rest.addressLine1 !== undefined && { addressLine1: rest.addressLine1 }),
                    ...(rest.addressLine2 !== undefined && { addressLine2: rest.addressLine2 }),
                    ...(rest.city !== undefined && { city: rest.city }),
                    ...(rest.state !== undefined && { state: rest.state }),
                    ...(rest.country !== undefined && { country: rest.country }),
                    ...(rest.postalCode !== undefined && { postalCode: rest.postalCode }),
                    ...(isDefault === true && { isDefault: true }),
                },
            });
        });

        return {
            message: 'Address updated successfully',
            address: updatedAddress,
        };
    }

    async deleteAddress(userId: string, addressId: string) {
        await this.ensureUserExists(userId);
        const existingAddress = await this.findAddressOrThrow(userId, addressId);

        await this.prisma.$transaction(async (tx) => {
            await tx.userAddrees.delete({
                where: { id: existingAddress.id },
            });

            if (existingAddress.isDefault) {
                const nextAddress = await tx.userAddrees.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true },
                });

                if (nextAddress) {
                    await tx.userAddrees.update({
                        where: { id: nextAddress.id },
                        data: { isDefault: true },
                    });
                }
            }
        });

        return { message: 'Address deleted successfully' };
    }

    async makeAddressDefault(userId: string, addressId: string) {
        await this.ensureUserExists(userId);
        const existingAddress = await this.findAddressOrThrow(userId, addressId);

        if (existingAddress.isDefault) {
            return {
                message: 'Address is already default',
                address: existingAddress,
            };
        }

        const updatedAddress = await this.prisma.$transaction(async (tx) => {
            await tx.userAddrees.updateMany({
                where: { userId },
                data: { isDefault: false },
            });

            return tx.userAddrees.update({
                where: { id: existingAddress.id },
                data: { isDefault: true },
            });
        });

        return {
            message: 'Default address updated successfully',
            address: updatedAddress,
        };
    }
}
