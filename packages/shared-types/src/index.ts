// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: PaginationMeta;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ============================================
// Auth Types
// ============================================

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface JwtPayload {
    sub: string; // userId
    email: string;
    role: UserRole;
    tenantId?: string;
    iat: number;
    exp: number;
}

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    ANALYST = 'ANALYST',
    CLIENT = 'CLIENT',
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

// ============================================
// User & Tenant Types
// ============================================

export interface UserDto {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: UserRole;
    status: UserStatus;
    tenantId?: string;
    mfaEnabled: boolean;
    createdAt: string;
}

export interface TenantDto {
    id: string;
    name: string;
    cnpj?: string;
    email: string;
    plan: Plan;
    createdAt: string;
}

export enum Plan {
    STARTER = 'STARTER',
    PROFESSIONAL = 'PROFESSIONAL',
    ENTERPRISE = 'ENTERPRISE',
}

// ============================================
// Work Types
// ============================================

export interface WorkDto {
    id: string;
    tenantId: string;
    title: string;
    author?: string;
    isbn?: string;
    description?: string;
    excerpt?: string;
    keywords: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateWorkDto {
    title: string;
    author?: string;
    isbn?: string;
    description?: string;
    excerpt?: string;
    keywords?: string[];
}

// ============================================
// Monitoring & Crawling Types
// ============================================

export enum JobStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export interface MonitoringJobDto {
    id: string;
    tenantId: string;
    workId: string;
    queries: string[];
    schedule: string;
    status: JobStatus;
    lastRunAt?: string;
    nextRunAt?: string;
    runCount: number;
    createdAt: string;
}

export interface CreateMonitoringJobDto {
    workId: string;
    queries: string[];
    schedule: string;
}

// ============================================
// Detection Types
// ============================================

export enum DetectionStatus {
    NEW = 'NEW',
    REVIEWING = 'REVIEWING',
    VALIDATED = 'VALIDATED',
    REJECTED = 'REJECTED',
    ARCHIVED = 'ARCHIVED',
}

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DetectionDto {
    id: string;
    workId: string;
    url: string;
    domain: string;
    score: number;
    confidence: ConfidenceLevel;
    reasons: string[];
    status: DetectionStatus;
    evidenceId?: string;
    createdAt: string;
}

// ============================================
// Case Types
// ============================================

export enum CaseStatus {
    NEW = 'NEW',
    VALIDATED = 'VALIDATED',
    REMOVAL_REQUESTED = 'REMOVAL_REQUESTED',
    REMOVED = 'REMOVED',
    REJECTED = 'REJECTED',
    CLOSED = 'CLOSED',
}

export interface CaseDto {
    id: string;
    detectionId: string;
    analystId?: string;
    status: CaseStatus;
    priority: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// Takedown Types
// ============================================

export enum TakedownStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    ACKNOWLEDGED = 'ACKNOWLEDGED',
    REMOVED = 'REMOVED',
    REJECTED = 'REJECTED',
    FAILED = 'FAILED',
}

export enum TakedownPlatform {
    GOOGLE_SEARCH = 'GOOGLE_SEARCH',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    SCRIBD = 'SCRIBD',
    TELEGRAM = 'TELEGRAM',
    GENERIC_DMCA = 'GENERIC_DMCA',
    OTHER = 'OTHER',
}

export interface TakedownRequestDto {
    id: string;
    caseId: string;
    platform: TakedownPlatform;
    status: TakedownStatus;
    attempts: number;
    sentAt?: string;
    respondedAt?: string;
    createdAt: string;
}

export interface CreateTakedownDto {
    caseId: string;
    platform: TakedownPlatform;
    templateId?: string;
}

// ============================================
// Report Types
// ============================================

export interface DashboardStatsDto {
    totalWorks: number;
    totalDetections: number;
    pendingDetections: number;
    successfulTakedowns: number;
    takedownRate: number; // percentage
    detectionsThisMonth: number;
    takedownsThisMonth: number;
}

export interface DetectionTrendDto {
    date: string;
    count: number;
}

// ============================================
// Queue Message Types
// ============================================

export interface CrawlJobMessage {
    jobId: string;
    workId: string;
    tenantId: string;
    query: string;
    priority: number;
}

export interface ExtractionJobMessage {
    crawlResultId: string;
    url: string;
    contentPath: string;
}

export interface DetectionJobMessage {
    crawlResultId: string;
    workId: string;
    fingerprintId?: string;
}

export interface TakedownJobMessage {
    caseId: string;
    takedownRequestId: string;
    platform: TakedownPlatform;
    attempt: number;
}
