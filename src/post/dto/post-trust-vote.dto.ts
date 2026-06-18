import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

    @ApiProperty({
        description: 'Optional comment to add with trust vote (AGREE, DISAGREE, or NOT_SURE)',
        required: false,
        example: 'I trust this post because it includes evidence.',
    })
    @IsOptional()
    @IsString()
    comment?: string;
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
