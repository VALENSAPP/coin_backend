import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
    /** Reads an HTML template from /public, replaces {{placeholders}}, and sends it via SendGrid. */
    async sendTemplateEmail(params: {
        to: string;
        subject: string;
        templateFile: string;
        replacements: Record<string, string>;
        text?: string;
    }) {
        const { to, subject, templateFile, replacements, text } = params;

        const apiKey = process.env.SENDGRID_API_KEY;
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@valens.com';

        if (!apiKey) {
            console.warn(`[MailService] SENDGRID_API_KEY is not set. Skipping email to ${to}`);
            return;
        }

        sgMail.setApiKey(apiKey);

        // Check possible paths for the template
        const candidatePaths = [
            path.join(process.cwd(), 'public', templateFile),
            path.join(process.cwd(), 'coin_backend', 'public', templateFile),
            path.join(__dirname, '..', '..', '..', 'public', templateFile),
        ];

        let templatePath = candidatePaths.find(p => fs.existsSync(p));
        if (!templatePath) {
            console.error(`[MailService] Template file not found: ${templateFile}. Checked paths:`, candidatePaths);
            throw new Error(`Template file not found: ${templateFile}`);
        }

        let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

        for (const [key, value] of Object.entries(replacements)) {
            htmlTemplate = htmlTemplate.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        await sgMail.send({
            to,
            from: fromEmail,
            subject,
            html: htmlTemplate,
            text: text || subject,
        });
        console.log(`[MailService] Successfully sent email "${subject}" to ${to}`);
    }
}
