import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('detection-service');

export interface FingerprintResult {
    sha256: string;
    ssdeep?: string;
    simhash?: string;
    textLength: number;
    wordCount: number;
}

@Injectable()
export class FingerprintService {
    /**
     * Generate fingerprints for content
     */
    generateFingerprint(content: string | Buffer): FingerprintResult {
        const text = Buffer.isBuffer(content) ? content.toString('utf-8') : content;

        // SHA-256 exact hash
        const sha256 = createHash('sha256').update(text).digest('hex');

        // Simple simhash implementation for text similarity
        const simhash = this.calculateSimhash(text);

        // Word count
        const words = text.split(/\s+/).filter(w => w.length > 0);

        return {
            sha256,
            simhash,
            textLength: text.length,
            wordCount: words.length,
        };
    }

    /**
     * Simple SimHash implementation for text similarity detection
     */
    private calculateSimhash(text: string): string {
        const features = this.extractFeatures(text);
        const hashBits = 64;
        const v = new Array(hashBits).fill(0);

        for (const feature of features) {
            const hash = this.hashString(feature);
            for (let i = 0; i < hashBits; i++) {
                const bit = (hash >> BigInt(i)) & 1n;
                v[i] += bit === 1n ? 1 : -1;
            }
        }

        let simhash = 0n;
        for (let i = 0; i < hashBits; i++) {
            if (v[i]! > 0) {
                simhash |= 1n << BigInt(i);
            }
        }

        return simhash.toString(16).padStart(16, '0');
    }

    private extractFeatures(text: string): string[] {
        // Extract n-grams (3-word shingles)
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2);

        const features: string[] = [];
        for (let i = 0; i < words.length - 2; i++) {
            features.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
        }

        return features;
    }

    private hashString(str: string): bigint {
        // Simple hash function for demonstration
        const hash = createHash('md5').update(str).digest('hex');
        return BigInt('0x' + hash.slice(0, 16));
    }

    /**
     * Calculate Hamming distance between two simhashes
     */
    calculateSimilarity(hash1: string, hash2: string): number {
        const h1 = BigInt('0x' + hash1);
        const h2 = BigInt('0x' + hash2);
        const xor = h1 ^ h2;

        // Count differing bits
        let distance = 0;
        let bits = xor;
        while (bits > 0n) {
            distance += Number(bits & 1n);
            bits >>= 1n;
        }

        // Convert to similarity (0-1 range)
        // 64 bits total, so max distance is 64
        return 1 - distance / 64;
    }
}
