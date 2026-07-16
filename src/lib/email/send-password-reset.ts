import { safeFetch } from "@/lib/fetch/safe-fetch";

type SendPasswordResetEmailInput = {
  to: string;
  resetLink: string;
};

type SendResult = { ok: true } | { ok: false; error: string };

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Nova Home Decor <onboarding@resend.dev>";

  if (!apiKey) {
    return null;
  }

  return { apiKey, from };
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<SendResult> {
  const config = getResendConfig();
  if (!config) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  const fetchResult = await safeFetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.to],
      subject: "Nova Home Decor — Reset admin password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2F2F2F">
          <h2 style="margin:0 0 12px">Reset your password</h2>
          <p>You requested a password reset for the Nova Home Decor admin panel.</p>
          <p>
            <a href="${input.resetLink}" style="display:inline-block;padding:12px 20px;background:#C9A96E;color:#F5F5F2;text-decoration:none;border-radius:20px">
              Reset password
            </a>
          </p>
          <p style="color:#666666;font-size:14px">If you did not request this, you can ignore this email.</p>
        </div>
      `,
    }),
    timeoutMs: 10000,
  });

  if (!fetchResult.ok) {
    return { ok: false, error: fetchResult.error };
  }

  const response = fetchResult.response;

  if (!response.ok) {
    let message = `Resend error (${response.status})`;
    try {
      const body = (await response.json()) as {
        message?: string;
        name?: string;
        error?: string;
      };
      if (body.message) message = body.message;
      else if (body.error) message = body.error;

      // Common local/dev trap: onboarding@resend.dev can only send to the Resend account owner.
      if (
        /only send (testing|to your own)|verify a domain|not authorized/i.test(
          message,
        )
      ) {
        message = `${message} Verify a domain in Resend and set RESEND_FROM_EMAIL to an address on that domain.`;
      }
    } catch {
      // ignore parse errors
    }
    return { ok: false, error: message };
  }

  return { ok: true };
}

export function isResendConfigured(): boolean {
  return !!getResendConfig();
}
