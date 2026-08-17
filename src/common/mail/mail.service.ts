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

        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

        const templatePath = path.join(process.cwd(), 'public', templateFile);
        let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

        for (const [key, value] of Object.entries(replacements)) {
            htmlTemplate = htmlTemplate.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        await sgMail.send({
            to,
            from: process.env.SENDGRID_FROM_EMAIL!,
            subject,
            html: htmlTemplate,
            text: text || subject,
        });
    }
}
