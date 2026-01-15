import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';
import { JobStatus } from '@protecliter/shared-types';

export class CreateJobDto {
    @IsString()
    workId: string;

    @IsArray()
    @IsString({ each: true })
    queries: string[];

    @IsOptional()
    @IsString()
    schedule?: string; // Cron expression, default: every 6 hours
}

export class UpdateJobDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    queries?: string[];

    @IsOptional()
    @IsString()
    schedule?: string;

    @IsOptional()
    @IsEnum(JobStatus)
    status?: JobStatus;
}

export class TriggerJobDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    specificQueries?: string[]; // Run only specific queries
}
