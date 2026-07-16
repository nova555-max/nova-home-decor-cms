import { safeFetch } from "@/lib/fetch/safe-fetch";

type SendOtpEmailInput = {
  to: string;
  otp: string;
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

export async function sendPasswordOtpEmail(
  input: SendOtpEmailInput,
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
      subject: "Your Nova Home Decor verification code",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2F2F2F">
          <p>Your verification code is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;margin:16px 0">${input.otp}</p>
          <p>This code expires in 10 minutes.</p>
          <p style="color:#666666;font-size:14px">If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
      text: [
        "Your verification code is:",
        input.otp,
        "",
        "This code expires in 10 minutes.",
        "If you did not request a password reset, please ignore this email.",
      ].join("\n"),
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
        error?: string;
      };
      if (body.message) message = body.message;
      else if (body.error) message = body.error;

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
