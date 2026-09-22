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

        const appRedirectUrl =
            process.env.APP_REDIRECT_URL ||
            (process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/$/, '')}/open-app` : '') ||
            (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/open-app` : '') ||
            'https://api.valens.app/open-app';

        const defaultLogoUrl =
            process.env.APP_LOGO_URL ||
            'https://valens-s3-2026.s3.us-west-1.amazonaws.com/assets/valens-logo.png';

        const defaultReplacements: Record<string, string> = {
            appUrl: appRedirectUrl,
            app_url: appRedirectUrl,
            logoUrl: defaultLogoUrl,
            logo_url: defaultLogoUrl,
            profileUrl: appRedirectUrl,
            profile_url: appRedirectUrl,
            companyName: 'Valens Technologies INC.',
            company_name: 'Valens Technologies INC.',
        };

        const mergedReplacements = { ...defaultReplacements, ...replacements };

        for (const [key, value] of Object.entries(mergedReplacements)) {
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
