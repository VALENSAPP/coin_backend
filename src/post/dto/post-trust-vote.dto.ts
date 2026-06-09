import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum PostTrustVoteType {
    AGREE = 'AGREE',
    DISAGREE = 'DISAGREE',
    NOT_SURE = 'NOT_SURE',
}

export class PostTrustVoteDto {
    @ApiProperty({ description: 'Post ID to trust-vote on' })
    @IsString()
    @IsNotEmpty()
    postId!: string;

    @ApiProperty({
        description: 'Trust vote type',
        enum: PostTrustVoteType,
        example: PostTrustVoteType.AGREE,
    })
    @IsEnum(PostTrustVoteType)
    voteType!: PostTrustVoteType;
}

export class GetPostTrustScoreDto {
    @ApiProperty({ description: 'Post ID to fetch trust score' })
    @IsString()
    @IsNotEmpty()
    postId!: string;
}

export class RemovePostTrustVoteDto {
    @ApiProperty({ description: 'Post ID to remove trust vote' })
    @IsString()
    @IsNotEmpty()
    postId!: string;
}
