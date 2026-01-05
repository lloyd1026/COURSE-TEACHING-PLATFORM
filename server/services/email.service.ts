import nodemailer from "nodemailer";
import { ENV } from "../_core/env";

// Reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: ENV.smtpUser,
        pass: ENV.smtpPass,
    },
});

export const emailService = {
    /**
     * Send an email
     * @param to Recipient email
     * @param subject Email subject
     * @param text Plain text body
     * @param html HTML body (optional)
     */
    send: async (to: string, subject: string, text: string, html?: string) => {
        if (!ENV.smtpUser || !ENV.smtpPass) {
            console.warn(
                "[EmailService] SMTP credentials not configured. Email to",
                to,
                "skipped."
            );
            console.log(`[Content] Subject: ${subject}\nBody: ${text}`);
            return;
        }

        try {
            const info = await transporter.sendMail({
                from: `"智慧教学平台" <${ENV.smtpUser}>`, // sender address
                to, // list of receivers
                subject, // Subject line
                text, // plain text body
                html, // html body
            });
            console.log("[EmailService] Message sent: %s", info.messageId);
            return info;
        } catch (error) {
            console.error("[EmailService] Error sending email:", error);
            throw error;
        }
    },
};
