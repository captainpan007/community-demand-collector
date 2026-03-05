"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReportEmail = sendReportEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
async function sendReportEmail(config, payload) {
    const emailCfg = config.notifications.email;
    if (!emailCfg?.to || !emailCfg.from) {
        return;
    }
    // 优先使用 Resend
    if (emailCfg.resendApiKey) {
        try {
            await axios_1.default.post('https://api.resend.com/emails', {
                from: emailCfg.from,
                to: [emailCfg.to],
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
            }, {
                headers: {
                    Authorization: `Bearer ${emailCfg.resendApiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return;
        }
        catch (e) {
            console.error('[email] Resend failed, fallback to SMTP if configured.', e.message);
        }
    }
    if (!emailCfg.smtp?.host || !emailCfg.smtp.user || !emailCfg.smtp.pass) {
        return;
    }
    const transporter = nodemailer_1.default.createTransport({
        host: emailCfg.smtp.host,
        port: emailCfg.smtp.port ?? 587,
        secure: emailCfg.smtp.secure ?? false,
        auth: {
            user: emailCfg.smtp.user,
            pass: emailCfg.smtp.pass,
        },
    });
    await transporter.sendMail({
        from: emailCfg.from,
        to: emailCfg.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
    });
}
//# sourceMappingURL=email.js.map