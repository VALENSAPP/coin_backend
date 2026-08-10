import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class DeliverOrderOtpDto {
    @ApiProperty({
        description: '6-digit OTP received by buyer email',
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;
}
