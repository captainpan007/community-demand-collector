import { AppConfig } from '../config';
export interface EmailPayload {
    subject: string;
    text?: string;
    html?: string;
}
export declare function sendReportEmail(config: AppConfig, payload: EmailPayload): Promise<void>;
//# sourceMappingURL=email.d.ts.map