import { config } from "../config";

/**
 * Email template interface
 */
interface EmailTemplate {
    subject: string;
    html: string;
    text?: string;
}

/**
 * Email service for sending transactional emails
 * Supports multiple providers (SendGrid, AWS SES, etc.)
 */
export class EmailService {
    private fromEmail: string;
    private fromName: string;

    constructor() {
        this.fromEmail = config.EMAIL_FROM;
        this.fromName = config.EMAIL_FROM_NAME;
    }

    /**
     * Send email
     */
    async sendEmail(to: string, template: EmailTemplate, data?: any): Promise<void> {
        try {
            const compiledTemplate = this.compileTemplate(template, data);

            if (config.EMAIL_SERVICE === "sendgrid") {
                await this.sendWithSendGrid(to, compiledTemplate);
            } else if (config.EMAIL_SERVICE === "ses") {
                await this.sendWithSES(to, compiledTemplate);
            } else {
                // Log email in development
                console.log("Email would be sent:", {
                    to,
                    from: `${this.fromName} <${this.fromEmail}>`,
                    subject: compiledTemplate.subject,
                    html: compiledTemplate.html,
                });
            }
        } catch (error) {
            console.error("Failed to send email:", error);
            throw new Error("Email sending failed");
        }
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(to: string, data: { username: string; verificationUrl: string }): Promise<void> {
        const template = this.getWelcomeTemplate();
        await this.sendEmail(to, template, data);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(to: string, data: { username: string; resetUrl: string }): Promise<void> {
        const template = this.getPasswordResetTemplate();
        await this.sendEmail(to, template, data);
    }

    /**
     * Send email verification
     */
    async sendEmailVerification(to: string, data: { username: string; verificationUrl: string }): Promise<void> {
        const template = this.getEmailVerificationTemplate();
        await this.sendEmail(to, template, data);
    }

    /**
     * Send recommendation email
     */
    async sendRecommendationEmail(to: string, data: { username: string; recommendations: any[] }): Promise<void> {
        const template = this.getRecommendationTemplate();
        await this.sendEmail(to, template, data);
    }

    /**
     * Compile template with data
     */
    private compileTemplate(template: EmailTemplate, data: any = {}): EmailTemplate {
        let html = template.html;
        let text = template.text || "";
        let subject = template.subject;

        // Replace placeholders
        Object.keys(data).forEach((key) => {
            const value = data[key];
            const placeholder = new RegExp(`{{${key}}}`, "g");
            html = html.replace(placeholder, value);
            text = text.replace(placeholder, value);
            subject = subject.replace(placeholder, value);
        });

        return { subject, html, text };
    }

    /**
     * Send with SendGrid
     */
    private async sendWithSendGrid(to: string, template: EmailTemplate): Promise<void> {
        if (!config.EMAIL_API_KEY) {
            throw new Error("SendGrid API key not configured");
        }

        // Note: In a real implementation, you'd use @sendgrid/mail
        // This is a placeholder
        console.log("SendGrid email would be sent:", { to, ...template });
    }

    /**
     * Send with AWS SES
     */
    private async sendWithSES(to: string, template: EmailTemplate): Promise<void> {
        // Note: In a real implementation, you'd use AWS SDK
        // This is a placeholder
        console.log("AWS SES email would be sent:", { to, ...template });
    }

    /**
     * Email templates
     */
    private getWelcomeTemplate(): EmailTemplate {
        return {
            subject: "Welcome to Movie Recommender!",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9fafb; }
                        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to Movie Recommender!</h1>
                        </div>
                        <div class="content">
                            <h2>Hi {{username}},</h2>
                            <p>Thanks for joining Movie Recommender! We're excited to help you discover your next favorite movie.</p>
                            <p>To get started, please verify your email address:</p>
                            <p style="text-align: center;">
                                <a href="{{verificationUrl}}" class="button">Verify Email</a>
                            </p>
                            <p>Once verified, you can:</p>
                            <ul>
                                <li>Rate movies to get personalized recommendations</li>
                                <li>Create custom lists</li>
                                <li>Import your ratings from IMDB</li>
                                <li>Discover new movies based on your taste</li>
                            </ul>
                            <p>Happy watching!</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Movie Recommender. All rights reserved.</p>
                            <p>If you didn't create an account, please ignore this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Welcome to Movie Recommender!

                Hi {{username}},

                Thanks for joining Movie Recommender! We're excited to help you discover your next favorite movie.

                To get started, please verify your email address by visiting:
                {{verificationUrl}}

                Once verified, you can:
                - Rate movies to get personalized recommendations
                - Create custom lists
                - Import your ratings from IMDB
                - Discover new movies based on your taste

                Happy watching!

                © 2024 Movie Recommender. All rights reserved.
                If you didn't create an account, please ignore this email.
            `,
        };
    }

    private getPasswordResetTemplate(): EmailTemplate {
        return {
            subject: "Reset Your Password - Movie Recommender",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9fafb; }
                        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <h2>Hi {{username}},</h2>
                            <p>We received a request to reset your password. Click the button below to create a new password:</p>
                            <p style="text-align: center;">
                                <a href="{{resetUrl}}" class="button">Reset Password</a>
                            </p>
                            <p>This link will expire in 1 hour for security reasons.</p>
                            <p>If you didn't request a password reset, please ignore this email. Your password won't be changed.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Movie Recommender. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Password Reset Request

                Hi {{username}},

                We received a request to reset your password. Visit the link below to create a new password:
                {{resetUrl}}

                This link will expire in 1 hour for security reasons.

                If you didn't request a password reset, please ignore this email. Your password won't be changed.

                © 2024 Movie Recommender. All rights reserved.
            `,
        };
    }

    private getEmailVerificationTemplate(): EmailTemplate {
        return {
            subject: "Verify Your Email - Movie Recommender",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9fafb; }
                        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Verify Your Email</h1>
                        </div>
                        <div class="content">
                            <h2>Hi {{username}},</h2>
                            <p>Please verify your email address to complete your registration:</p>
                            <p style="text-align: center;">
                                <a href="{{verificationUrl}}" class="button">Verify Email</a>
                            </p>
                            <p>This link will expire in 24 hours.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Movie Recommender. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };
    }

    private getRecommendationTemplate(): EmailTemplate {
        return {
            subject: "Your Weekly Movie Recommendations",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9fafb; }
                        .movie { border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; background: white; }
                        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Your Weekly Recommendations</h1>
                        </div>
                        <div class="content">
                            <h2>Hi {{username}},</h2>
                            <p>Based on your ratings, we think you'll love these movies:</p>
                            <!-- Recommendations will be dynamically inserted here -->
                        </div>
                        <div class="footer">
                            <p>© 2024 Movie Recommender. All rights reserved.</p>
                            <p>You can update your email preferences in your account settings.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };
    }
}
