import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // 환경변수 없으면 무시
  try {
    await resend.emails.send({
      from: 'LiveOrder <noreply@liveorder.app>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[email] send failed:', error);
    // 이메일 실패는 비즈니스 로직에 영향 없음
  }
}

// 관리자 이메일 (셀러 가입 알림 수신)
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@liveorder.app';
