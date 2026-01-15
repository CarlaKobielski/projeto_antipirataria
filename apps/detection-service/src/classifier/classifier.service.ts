import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FingerprintService } from '../fingerprint/fingerprint.service';
import { ConfidenceLevel } from '@protecliter/shared-types';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('detection-service');

export interface ClassificationResult {
    score: number;
    confidence: ConfidenceLevel;
    reasons: string[];
    fingerprintMatch?: number;
}

// Known piracy domain patterns
const SUSPICIOUS_DOMAINS = [
    'z-lib', 'libgen', 'sci-hub', 'pdfdrive', 'b-ok',
    'bookfi', 'bookzz', 'freebookspot', '4shared',
    'scribd-download', 'pdf-download', 'free-ebook',
];

// Suspicious URL patterns
const SUSPICIOUS_PATTERNS = [
    /download.*pdf/i,
    /free.*download/i,
    /baixar.*gratis/i,
    /livro.*gratis/i,
    /ebook.*free/i,
    /pirat/i,
];

@Injectable()
export class ClassifierService {
    constructor(
        private prisma: PrismaService,
        private fingerprintService: FingerprintService,
    ) { }

    /**
     * Classify a crawl result to determine if it's a potential copyright violation
     */
    async classify(
        workId: string,
        url: string,
        pageText: string,
        pageTitle?: string,
    ): Promise<ClassificationResult> {
        const reasons: string[] = [];
        let score = 0;

        // Get the work details for matching
        const work = await this.prisma.work.findUnique({
            where: { id: workId },
        });

        if (!work) {
            return { score: 0, confidence: 'LOW', reasons: ['Work not found'] };
        }

        // 1. Domain reputation check (20% weight)
        const domain = new URL(url).hostname.toLowerCase();
        const domainScore = this.checkDomainReputation(domain);
        if (domainScore > 0) {
            score += domainScore * 0.2;
            reasons.push(`Suspicious domain: ${domain}`);
        }

        // 2. URL pattern matching (10% weight)
        const urlScore = this.checkUrlPatterns(url);
        if (urlScore > 0) {
            score += urlScore * 0.1;
            reasons.push('URL contains suspicious patterns');
        }

        // 3. Title matching (30% weight)
        const titleMatch = this.calculateTitleMatch(work.title, pageTitle || '', pageText);
        if (titleMatch > 0.5) {
            score += titleMatch * 0.3;
            reasons.push(`Title match: ${Math.round(titleMatch * 100)}%`);
        }

        // 4. Author matching (15% weight)
        if (work.author) {
            const authorMatch = this.checkAuthorPresence(work.author, pageText);
            if (authorMatch > 0) {
                score += authorMatch * 0.15;
                reasons.push(`Author found in content`);
            }
        }

        // 5. ISBN matching (15% weight)
        if (work.isbn) {
            const isbnMatch = this.checkIsbnPresence(work.isbn, pageText);
            if (isbnMatch) {
                score += 1.0 * 0.15;
                reasons.push(`ISBN match: ${work.isbn}`);
            }
        }

        // 6. Keyword matching (10% weight)
        const keywordScore = this.checkKeywords(work.keywords, pageText);
        if (keywordScore > 0) {
            score += keywordScore * 0.1;
            reasons.push(`Keywords matched: ${Math.round(keywordScore * 100)}%`);
        }

        // Determine confidence level
        let confidence: ConfidenceLevel;
        if (score >= 0.7) {
            confidence = 'HIGH';
        } else if (score >= 0.4) {
            confidence = 'MEDIUM';
        } else {
            confidence = 'LOW';
        }

        // Calculate fingerprint similarity if we have stored fingerprints
        // This would compare against the original work's fingerprint
        const fingerprintMatch = undefined; // Would be calculated here

        logger.debug(`Classification result for ${url}: score=${score.toFixed(2)}, confidence=${confidence}`);

        return {
            score: Math.min(score, 1), // Cap at 1.0
            confidence,
            reasons,
            fingerprintMatch,
        };
    }

    private checkDomainReputation(domain: string): number {
        for (const suspicious of SUSPICIOUS_DOMAINS) {
            if (domain.includes(suspicious)) {
                return 1.0;
            }
        }
        return 0;
    }

    private checkUrlPatterns(url: string): number {
        for (const pattern of SUSPICIOUS_PATTERNS) {
            if (pattern.test(url)) {
                return 1.0;
            }
        }
        return 0;
    }

    private calculateTitleMatch(workTitle: string, pageTitle: string, pageText: string): number {
        const normalizedWork = workTitle.toLowerCase().trim();
        const normalizedPage = pageTitle.toLowerCase().trim();
        const normalizedText = pageText.toLowerCase();

        // Exact title match in page title
        if (normalizedPage.includes(normalizedWork)) {
            return 1.0;
        }

        // Title in page content
        if (normalizedText.includes(normalizedWork)) {
            return 0.8;
        }

        // Partial matching (Jaccard similarity)
        const workWords = new Set(normalizedWork.split(/\s+/));
        const pageWords = new Set(normalizedPage.split(/\s+/));

        const intersection = [...workWords].filter(w => pageWords.has(w));
        const union = new Set([...workWords, ...pageWords]);

        if (union.size === 0) return 0;

        return intersection.length / union.size;
    }

    private checkAuthorPresence(author: string, text: string): number {
        const normalizedAuthor = author.toLowerCase();
        const normalizedText = text.toLowerCase();

        if (normalizedText.includes(normalizedAuthor)) {
            return 1.0;
        }

        // Check for last name only
        const lastName = normalizedAuthor.split(/\s+/).pop();
        if (lastName && normalizedText.includes(lastName)) {
            return 0.5;
        }

        return 0;
    }

    private checkIsbnPresence(isbn: string, text: string): boolean {
        // Normalize ISBN (remove hyphens and spaces)
        const normalizedIsbn = isbn.replace(/[-\s]/g, '');
        const normalizedText = text.replace(/[-\s]/g, '');

        return normalizedText.includes(normalizedIsbn);
    }

    private checkKeywords(keywords: string[], text: string): number {
        if (!keywords || keywords.length === 0) return 0;

        const normalizedText = text.toLowerCase();
        let matches = 0;

        for (const keyword of keywords) {
            if (normalizedText.includes(keyword.toLowerCase())) {
                matches++;
            }
        }

        return matches / keywords.length;
    }
}
