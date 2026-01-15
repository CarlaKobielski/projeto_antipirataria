import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('crawler-service');

export interface FetchResult {
    url: string;
    statusCode: number;
    contentType: string;
    headers: Record<string, string>;
    html: string;
    title?: string;
    links: string[];
    text: string;
}

@Injectable()
export class FetcherService {
    private userAgent = 'ProtecLiter-Bot/1.0 (+https://protecliter.com/bot)';

    async fetch(url: string): Promise<FetchResult> {
        logger.debug(`Fetching: ${url}`);

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                },
                redirect: 'follow',
                signal: AbortSignal.timeout(30000), // 30s timeout
            });

            const html = await response.text();
            const $ = cheerio.load(html);

            // Extract text content
            $('script, style, noscript, iframe').remove();
            const text = $('body').text().replace(/\s+/g, ' ').trim();

            // Extract links
            const links: string[] = [];
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    try {
                        const absoluteUrl = new URL(href, url).href;
                        links.push(absoluteUrl);
                    } catch {
                        // Invalid URL, skip
                    }
                }
            });

            // Convert headers to object
            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });

            return {
                url: response.url, // Final URL after redirects
                statusCode: response.status,
                contentType: response.headers.get('content-type') || 'text/html',
                headers,
                html,
                title: $('title').first().text().trim() || undefined,
                links,
                text: text.slice(0, 50000), // Limit text length
            };
        } catch (error: any) {
            logger.error(`Fetch error for ${url}: ${error.message}`);
            throw error;
        }
    }

    async fetchWithScreenshot(url: string): Promise<FetchResult & { screenshot?: Buffer }> {
        // For MVP, just do regular fetch
        // Puppeteer screenshot implementation would go here for full version
        const result = await this.fetch(url);
        return { ...result, screenshot: undefined };
    }

    async checkRobotsTxt(domain: string): Promise<boolean> {
        try {
            const robotsUrl = `${domain}/robots.txt`;
            const response = await fetch(robotsUrl, {
                headers: { 'User-Agent': this.userAgent },
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                return true; // No robots.txt, allow crawling
            }

            const text = await response.text();
            const lines = text.split('\n');

            let isOurBot = false;
            for (const line of lines) {
                const trimmed = line.trim().toLowerCase();
                if (trimmed.startsWith('user-agent:')) {
                    const agent = trimmed.replace('user-agent:', '').trim();
                    isOurBot = agent === '*' || agent.includes('protecliter');
                }
                if (isOurBot && trimmed.startsWith('disallow:')) {
                    const path = trimmed.replace('disallow:', '').trim();
                    if (path === '/' || path === '/*') {
                        return false; // Disallowed
                    }
                }
            }

            return true;
        } catch {
            return true; // Error checking, allow crawling
        }
    }
}
