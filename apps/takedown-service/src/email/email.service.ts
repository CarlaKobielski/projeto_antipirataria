import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createLogger } from '@protecliter/logger';

const logger = createLogger('takedown-service');

export interface EmailOptions {
    to: string;
    subject: string;
    body: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
    }>;
}

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '1025'),
            secure: false,
            auth: process.env.SMTP_USER ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            } : undefined,
        });
    }

    async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
        const from = process.env.SMTP_FROM || 'takedown@protecliter.com';

        try {
            const result = await this.transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                text: options.body,
                attachments: options.attachments,
            });

            logger.info(`Email sent to ${options.to}: ${result.messageId}`);

            return { messageId: result.messageId };
        } catch (error: any) {
            logger.error(`Failed to send email to ${options.to}: ${error.message}`);
            throw error;
        }
    }

    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            return true;
        } catch {
            return false;
        }
    }
}
