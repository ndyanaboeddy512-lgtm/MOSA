import { VerificationPurpose } from "./types";

interface TemplateContent {
  subject: string;
  badge: string;
  title: string;
  intro: string;
  codeLabel: string;
  expiryNote: string;
  securityWarning: string;
  ignoreNote: string;
}

const TEMPLATES: Record<string, Record<VerificationPurpose, TemplateContent>> = {
  en: {
    ACCOUNT_LOGIN: {
      subject: "Your MOSA Verification Code",
      badge: "Account Sign-In",
      title: "One-Time Sign-In Verification",
      intro: "Use the 4-digit verification code below to securely sign into your MOSA account.",
      codeLabel: "Verification Code",
      expiryNote: "This code expires in 10 minutes and can only be used once.",
      securityWarning: "Never share this code with anyone. MOSA administrators will never ask for your verification code.",
      ignoreNote: "If you did not attempt to sign in, please ignore this email or update your account password.",
    },
    PASSWORD_RESET: {
      subject: "MOSA Password Reset Verification Code",
      badge: "Password Recovery",
      title: "Reset Your Account Password",
      intro: "We received a request to reset the password for your MOSA account. Enter the verification code below to proceed.",
      codeLabel: "Password Reset Code",
      expiryNote: "This code expires in 10 minutes and is valid for one-time use.",
      securityWarning: "Keep this code confidential. Do not forward this email to anyone.",
      ignoreNote: "If you did not request a password reset, you can safely ignore this message. Your password remains unchanged.",
    },
    ACCOUNT_VERIFICATION: {
      subject: "Verify Your MOSA Account Email",
      badge: "Account Verification",
      title: "Confirm Your Email Address",
      intro: "Welcome to MOSA Rwanda. Please confirm your email address using the verification code below.",
      codeLabel: "Activation Code",
      expiryNote: "This code expires in 10 minutes.",
      securityWarning: "Protect your account credentials at all times.",
      ignoreNote: "If you did not create a MOSA account, no further action is required.",
    },
    ADMIN_PASSWORD_RESET: {
      subject: "MOSA Command Center — Administrator Password Reset",
      badge: "Command Center Security",
      title: "Administrator Password Reset Request",
      intro: "A password reset request was initiated for your MOSA Command Center administrator profile.",
      codeLabel: "Admin Verification Code",
      expiryNote: "This high-privilege verification code expires in 10 minutes.",
      securityWarning: "CRITICAL: Administrative security clearance is required. Never share this code.",
      ignoreNote: "If you did not initiate this request, notify the Lead Administrator immediately.",
    },
  },
  rw: {
    ACCOUNT_LOGIN: {
      subject: "Kode yawe yo kwinjira kuri MOSA",
      badge: "Kwinjira muri Konti",
      title: "Kwemeza Kwinjira",
      intro: "Koresha kode y'imibare 4 iri hasi kugira ngo winjire mu buryo butekanye kuri konti yawe ya MOSA.",
      codeLabel: "Kode Yemeza",
      expiryNote: "Iyi kode irangira mu minota 10 kandi ikoreshwa inshuro imwe gusa.",
      securityWarning: "Ntugire undi uha iyi kode. Abakozi ba MOSA ntibazigera bayigusaba.",
      ignoreNote: "Niba atari wowe wasabye kwinjira, irengagize ubu butumwa.",
    },
    PASSWORD_RESET: {
      subject: "Kode yo guhindura ijambobanga rya MOSA",
      badge: "Guhindura Ijambobanga",
      title: "Hindura Ijambobanga rya Konti",
      intro: "Twakiriye ubusabe bwo guhindura ijambobanga ryawe rya MOSA. Injiza kode iri hasi kugira ngo ukomeze.",
      codeLabel: "Kode yo Guhindura",
      expiryNote: "Iyi kode irangira mu minota 10 kandi ikoreshwa inshuro imwe gusa.",
      securityWarning: "Bika iyi kode mu ibanga rikomeye. Ntuyisangize undi uwo ari we wese.",
      ignoreNote: "Niba atari wowe wasabye guhindura ijambobanga, irengagize ubu butumwa.",
    },
    ACCOUNT_VERIFICATION: {
      subject: "Emeza imeli yawe kuri MOSA",
      badge: "Kwemeza Konti",
      title: "Emeza Imeli Yawe",
      intro: "Murakaza neza kuri MOSA Rwanda. Emeza imeli yawe ukoresheje kode iri hasi.",
      codeLabel: "Kode Yemeza",
      expiryNote: "Iyi kode irangira mu minota 10.",
      securityWarning: "Rinda amakuru yawe y'umutekano buri gihe.",
      ignoreNote: "Niba utafunguye konti kuri MOSA, nta kindi usabwa gukora.",
    },
    ADMIN_PASSWORD_RESET: {
      subject: "MOSA Command Center — Guhindura Ijambobanga ry'Ubuyobozi",
      badge: "Umutekano w'Ubuyobozi",
      title: "Guhindura Ijambobanga ry'Ubuyobozi",
      intro: "Hari ubusabe bwo guhindura ijambobanga rya konti yawe y'ubuyobozi bwa MOSA Command Center.",
      codeLabel: "Kode y'Ubuyobozi",
      expiryNote: "Iyi kode irangira mu minota 10.",
      securityWarning: "IKOMEYE: Ntukigere usangiza undi muntu iyi kode y'ubuyobozi.",
      ignoreNote: "Niba atari wowe wayisabye, menyyesha Umuyobozi Mukuru ako kanya.",
    },
  },
};

export function renderVerificationEmail(
  code: string,
  purpose: VerificationPurpose,
  lang: string = "en",
  recipientName?: string
): { subject: string; html: string; text: string } {
  const languageKey = lang === "rw" ? "rw" : "en";
  const content = TEMPLATES[languageKey]?.[purpose] || TEMPLATES.en[purpose];

  const greeting = recipientName 
    ? (languageKey === "rw" ? `Muraho ${recipientName},` : `Hello ${recipientName},`)
    : (languageKey === "rw" ? "Muraho," : "Hello,");

  const html = `
<!DOCTYPE html>
<html lang="${languageKey}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b1120; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #020617; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 36px 20px; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #091224 0%, #020617 100%);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; width: 40px; height: 40px; line-height: 40px; text-align: center; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; font-weight: 800; font-size: 20px; border-radius: 12px; margin-right: 12px; vertical-align: middle;">M</div>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; vertical-align: middle;">MOSA</span>
                    <span style="font-size: 11px; font-weight: 600; color: #34d399; letter-spacing: 1px; text-transform: uppercase; margin-left: 8px; vertical-align: middle;">Rwanda</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #34d399; background-color: rgba(5, 150, 105, 0.15); border: 1px solid rgba(5, 150, 105, 0.3); border-radius: 9999px;">
                      ${content.badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 36px 28px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #94a3b8; font-weight: 500;">
                ${greeting}
              </p>
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 1.3;">
                ${content.title}
              </h1>
              <p style="margin: 0 0 28px; font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                ${content.intro}
              </p>

              <!-- Code Showcase Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border: 2px solid #059669; border-radius: 16px; margin: 0 0 28px;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #34d399; margin-bottom: 8px;">
                      ${content.codeLabel}
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #ffffff; text-shadow: 0 2px 10px rgba(5, 150, 105, 0.5);">
                      ${code}
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
                      ⏱ ${content.expiryNote}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Callout -->
              <div style="background-color: #0b1329; border-left: 3px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #fbbf24;">
                  🛡️ Security Notice
                </p>
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                  ${content.securityWarning}
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                ${content.ignoreNote}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px 32px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #64748b; font-weight: 500;">
                MOSA Network • Rwanda's Community Commerce Discovery Network
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                Kigali, Rwanda • Privacy-Protected & Ethical Micro-Commerce
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
MOSA Rwanda — ${content.title}
${greeting}

${content.intro}

VERIFICATION CODE: ${code}
(${content.expiryNote})

Security Notice:
${content.securityWarning}

${content.ignoreNote}

MOSA Network (Rwanda) • Kigali, Rwanda
  `.trim();

  return { subject: content.subject, html, text };
}
