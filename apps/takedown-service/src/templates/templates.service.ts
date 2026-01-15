import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { TakedownPlatform } from '@protecliter/shared-types';

export interface TemplateData {
    // Work info
    workTitle: string;
    workAuthor?: string;
    workIsbn?: string;

    // Violation info
    infringingUrl: string;
    domain: string;

    // Claimant info
    claimantName: string;
    claimantEmail: string;
    claimantCompany?: string;
    claimantAddress?: string;
    claimantPhone?: string;

    // Evidence
    evidenceUrl?: string;
    detectionDate: string;

    // Additional
    signature?: string;
}

export interface TakedownTemplate {
    id: string;
    platform: TakedownPlatform;
    name: string;
    type: 'EMAIL' | 'FORM' | 'API';
    subject?: string;
    body: string;
    requiredFields: string[];
    recipientEmail?: string;
}

@Injectable()
export class TemplatesService {
    private templates: Map<string, TakedownTemplate> = new Map();

    constructor() {
        this.initializeTemplates();
    }

    private initializeTemplates() {
        // Google Search DMCA Template
        this.templates.set('google-search-dmca', {
            id: 'google-search-dmca',
            platform: TakedownPlatform.GOOGLE_SEARCH,
            name: 'Google Search DMCA Notice',
            type: 'FORM',
            subject: 'DMCA Takedown Request - {{workTitle}}',
            body: `DMCA TAKEDOWN NOTICE

I, {{claimantName}}, am the copyright owner (or authorized agent) of the work described below.

IDENTIFICATION OF COPYRIGHTED WORK:
Title: {{workTitle}}
{{#if workAuthor}}Author: {{workAuthor}}{{/if}}
{{#if workIsbn}}ISBN: {{workIsbn}}{{/if}}

INFRINGING MATERIAL:
URL: {{infringingUrl}}
Domain: {{domain}}
Date Detected: {{detectionDate}}

I have a good faith belief that use of the copyrighted materials described above on the allegedly infringing web pages is not authorized by the copyright owner, its agent, or the law.

I swear, under penalty of perjury, that the information in the notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

I acknowledge that under Section 512(f) of the DMCA any person who knowingly materially misrepresents that material or activity is infringing may be subject to liability for damages.

CONTACT INFORMATION:
Name: {{claimantName}}
{{#if claimantCompany}}Company: {{claimantCompany}}{{/if}}
Email: {{claimantEmail}}
{{#if claimantPhone}}Phone: {{claimantPhone}}{{/if}}
{{#if claimantAddress}}Address: {{claimantAddress}}{{/if}}

Signature: {{signature}}
Date: {{detectionDate}}`,
            requiredFields: ['workTitle', 'infringingUrl', 'claimantName', 'claimantEmail'],
        });

        // Generic DMCA Email Template
        this.templates.set('generic-dmca-email', {
            id: 'generic-dmca-email',
            platform: TakedownPlatform.GENERIC_DMCA,
            name: 'Generic DMCA Email',
            type: 'EMAIL',
            subject: 'DMCA Copyright Infringement Notice - {{workTitle}}',
            body: `Dear Sir/Madam,

I am writing to notify you of copyright infringement on your platform.

I, {{claimantName}}, am the copyright owner (or authorized representative) of the following work:

COPYRIGHTED WORK:
- Title: {{workTitle}}
{{#if workAuthor}}- Author: {{workAuthor}}{{/if}}
{{#if workIsbn}}- ISBN: {{workIsbn}}{{/if}}

INFRINGING CONTENT LOCATION:
{{infringingUrl}}

This content has been uploaded/published without authorization from the copyright holder.

Pursuant to the Digital Millennium Copyright Act (17 U.S.C. § 512), I request that you expeditiously remove or disable access to the infringing material.

I have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.

I swear, under penalty of perjury, that the information in this notification is accurate, and that I am the copyright owner or am authorized to act on behalf of the owner.

Please confirm receipt of this notice and inform me of any action taken.

Sincerely,

{{claimantName}}
{{#if claimantCompany}}{{claimantCompany}}{{/if}}
{{claimantEmail}}
{{#if claimantPhone}}Tel: {{claimantPhone}}{{/if}}`,
            requiredFields: ['workTitle', 'infringingUrl', 'claimantName', 'claimantEmail'],
        });

        // Scribd Template
        this.templates.set('scribd-dmca', {
            id: 'scribd-dmca',
            platform: TakedownPlatform.SCRIBD,
            name: 'Scribd DMCA Notice',
            type: 'EMAIL',
            recipientEmail: 'copyright@scribd.com',
            subject: 'Copyright Infringement Report - {{workTitle}}',
            body: `To Scribd Copyright Team,

I am reporting copyright infringement of my work on your platform.

COPYRIGHTED WORK:
Title: {{workTitle}}
{{#if workAuthor}}Author: {{workAuthor}}{{/if}}
{{#if workIsbn}}ISBN: {{workIsbn}}{{/if}}

INFRINGING URL:
{{infringingUrl}}

I am the copyright owner (or authorized to act on behalf of the owner) and I did not authorize this upload.

Please remove this content immediately.

Contact Information:
{{claimantName}}
{{claimantEmail}}
{{#if claimantCompany}}{{claimantCompany}}{{/if}}

I declare under penalty of perjury that this notice is accurate and that I am the copyright owner or authorized to act on behalf of the owner.

{{signature}}
{{detectionDate}}`,
            requiredFields: ['workTitle', 'infringingUrl', 'claimantName', 'claimantEmail'],
        });
    }

    getTemplate(id: string): TakedownTemplate | undefined {
        return this.templates.get(id);
    }

    getTemplatesForPlatform(platform: TakedownPlatform): TakedownTemplate[] {
        return Array.from(this.templates.values()).filter(t => t.platform === platform);
    }

    getAllTemplates(): TakedownTemplate[] {
        return Array.from(this.templates.values());
    }

    renderTemplate(templateId: string, data: TemplateData): { subject: string; body: string } {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const subjectTemplate = Handlebars.compile(template.subject || '');
        const bodyTemplate = Handlebars.compile(template.body);

        return {
            subject: subjectTemplate(data),
            body: bodyTemplate(data),
        };
    }

    validateTemplateData(templateId: string, data: Partial<TemplateData>): string[] {
        const template = this.templates.get(templateId);
        if (!template) {
            return ['Template not found'];
        }

        const missing = template.requiredFields.filter(
            field => !data[field as keyof TemplateData],
        );

        return missing;
    }
}
