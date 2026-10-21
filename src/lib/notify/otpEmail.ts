// The verification / password-reset email: a branded card with the 6-digit code in boxes (like the codes banks and job portals
// send), valid-for line, a safety note, in the user's language (right-to-left for Arabic and Urdu) with English underneath for
// everyone else. Plain-text version included for mail apps that do not show HTML.

type L = "en" | "ur" | "ar" | "de" | "fr" | "es" | "hi" | "pl";
interface Copy {
  subjectVerify: string;
  subjectReset: string;
  headVerify: string;
  headReset: string;
  introVerify: string;
  introReset: string;
  yourCode: string;
  valid: string; // {min}
  share: string;
  ignore: string;
  footer: string;
}

const COPY: Record<L, Copy> = {
  en: {
    subjectVerify: "Your Servigic verification code",
    subjectReset: "Your Servigic password reset code",
    headVerify: "Verify your account",
    headReset: "Reset your password",
    introVerify: "Use this code to verify your phone number and finish creating your Servigic account.",
    introReset: "Use this code to set a new password for your Servigic account.",
    yourCode: "Your code",
    valid: "This code is valid for {min} minutes.",
    share: "Never share this code with anyone. Servigic staff will never ask you for it.",
    ignore: "If you did not request this, you can safely ignore this email.",
    footer: "Servigic · Home services, fixed today",
  },
  ur: {
    subjectVerify: "آپ کا Servigic تصدیقی کوڈ",
    subjectReset: "آپ کا Servigic پاس ورڈ ری سیٹ کوڈ",
    headVerify: "اپنا اکاؤنٹ تصدیق کریں",
    headReset: "اپنا پاس ورڈ ری سیٹ کریں",
    introVerify: "اپنا فون نمبر تصدیق کرنے اور Servigic اکاؤنٹ مکمل کرنے کے لیے یہ کوڈ استعمال کریں۔",
    introReset: "اپنے Servigic اکاؤنٹ کا نیا پاس ورڈ بنانے کے لیے یہ کوڈ استعمال کریں۔",
    yourCode: "آپ کا کوڈ",
    valid: "یہ کوڈ {min} منٹ تک کارآمد ہے۔",
    share: "یہ کوڈ کسی کے ساتھ شیئر نہ کریں۔ Servigic کا عملہ کبھی یہ کوڈ نہیں مانگتا۔",
    ignore: "اگر آپ نے یہ درخواست نہیں کی تو اس ای میل کو نظرانداز کر دیں۔",
    footer: "Servigic · گھریلو خدمات، آج ہی ٹھیک",
  },
  ar: {
    subjectVerify: "رمز التحقق الخاص بك من Servigic",
    subjectReset: "رمز إعادة تعيين كلمة المرور من Servigic",
    headVerify: "تحقّق من حسابك",
    headReset: "إعادة تعيين كلمة المرور",
    introVerify: "استخدم هذا الرمز للتحقق من رقم هاتفك وإكمال إنشاء حسابك في Servigic.",
    introReset: "استخدم هذا الرمز لتعيين كلمة مرور جديدة لحسابك في Servigic.",
    yourCode: "رمزك",
    valid: "هذا الرمز صالح لمدة {min} دقائق.",
    share: "لا تشارك هذا الرمز مع أي شخص. لن يطلبه منك فريق Servigic أبداً.",
    ignore: "إذا لم تطلب هذا الرمز فيمكنك تجاهل هذه الرسالة بأمان.",
    footer: "Servigic · خدمات منزلية، إصلاح في يومك",
  },
  de: {
    subjectVerify: "Ihr Servigic-Bestätigungscode",
    subjectReset: "Ihr Servigic-Code zum Zurücksetzen des Passworts",
    headVerify: "Konto bestätigen",
    headReset: "Passwort zurücksetzen",
    introVerify: "Mit diesem Code bestätigen Sie Ihre Telefonnummer und schließen die Erstellung Ihres Servigic-Kontos ab.",
    introReset: "Mit diesem Code legen Sie ein neues Passwort für Ihr Servigic-Konto fest.",
    yourCode: "Ihr Code",
    valid: "Dieser Code ist {min} Minuten gültig.",
    share: "Geben Sie diesen Code an niemanden weiter. Servigic fragt nie danach.",
    ignore: "Wenn Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.",
    footer: "Servigic · Haushaltsdienste, heute erledigt",
  },
  fr: {
    subjectVerify: "Votre code de vérification Servigic",
    subjectReset: "Votre code de réinitialisation Servigic",
    headVerify: "Vérifiez votre compte",
    headReset: "Réinitialisez votre mot de passe",
    introVerify: "Utilisez ce code pour vérifier votre numéro et terminer la création de votre compte Servigic.",
    introReset: "Utilisez ce code pour définir un nouveau mot de passe pour votre compte Servigic.",
    yourCode: "Votre code",
    valid: "Ce code est valable {min} minutes.",
    share: "Ne partagez ce code avec personne. L’équipe Servigic ne vous le demandera jamais.",
    ignore: "Si vous n’avez rien demandé, vous pouvez ignorer cet e-mail.",
    footer: "Servigic · Services à domicile, réglés aujourd’hui",
  },
  es: {
    subjectVerify: "Tu código de verificación de Servigic",
    subjectReset: "Tu código para restablecer la contraseña de Servigic",
    headVerify: "Verifica tu cuenta",
    headReset: "Restablece tu contraseña",
    introVerify: "Usa este código para verificar tu teléfono y terminar de crear tu cuenta de Servigic.",
    introReset: "Usa este código para crear una nueva contraseña para tu cuenta de Servigic.",
    yourCode: "Tu código",
    valid: "Este código es válido durante {min} minutos.",
    share: "No compartas este código con nadie. El equipo de Servigic nunca te lo pedirá.",
    ignore: "Si no lo solicitaste, puedes ignorar este correo.",
    footer: "Servigic · Servicios para el hogar, arreglado hoy",
  },
  hi: {
    subjectVerify: "आपका Servigic सत्यापन कोड",
    subjectReset: "आपका Servigic पासवर्ड रीसेट कोड",
    headVerify: "अपना खाता सत्यापित करें",
    headReset: "अपना पासवर्ड रीसेट करें",
    introVerify: "अपना फ़ोन नंबर सत्यापित करने और Servigic खाता पूरा करने के लिए यह कोड इस्तेमाल करें।",
    introReset: "अपने Servigic खाते का नया पासवर्ड बनाने के लिए यह कोड इस्तेमाल करें।",
    yourCode: "आपका कोड",
    valid: "यह कोड {min} मिनट के लिए मान्य है।",
    share: "यह कोड किसी को न बताएँ। Servigic की टीम कभी यह कोड नहीं माँगती।",
    ignore: "अगर आपने यह अनुरोध नहीं किया तो इस ईमेल को अनदेखा करें।",
    footer: "Servigic · घरेलू सेवाएँ, आज ही ठीक",
  },
  pl: {
    subjectVerify: "Twój kod weryfikacyjny Servigic",
    subjectReset: "Twój kod resetowania hasła Servigic",
    headVerify: "Zweryfikuj konto",
    headReset: "Zresetuj hasło",
    introVerify: "Użyj tego kodu, aby zweryfikować numer telefonu i dokończyć zakładanie konta Servigic.",
    introReset: "Użyj tego kodu, aby ustawić nowe hasło do konta Servigic.",
    yourCode: "Twój kod",
    valid: "Ten kod jest ważny przez {min} minut.",
    share: "Nie udostępniaj tego kodu nikomu. Zespół Servigic nigdy o niego nie poprosi.",
    ignore: "Jeśli to nie Ty o to prosiłeś, zignoruj tę wiadomość.",
    footer: "Servigic · Usługi domowe, naprawione dziś",
  },
};

const isL = (x: string): x is L => x in COPY;
const RTL = new Set<string>(["ar", "ur"]);
const SITE = "https://www.servigic.com";

function block(c: Copy, code: string, minutes: number, reset: boolean, dir: "ltr" | "rtl") {
  const digits = code
    .split("")
    .map((d) => `<td style="padding:0 4px"><div style="width:44px;height:56px;line-height:56px;text-align:center;font-size:28px;font-weight:700;color:#14161d;background:#fff7e6;border:2px solid #ffb020;border-radius:10px;font-family:'Segoe UI',Arial,sans-serif">${d}</div></td>`)
    .join("");
  const align = dir === "rtl" ? "right" : "left";
  return `
    <div dir="${dir}" style="text-align:${align}">
      <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:#14161d;font-family:'Segoe UI',Arial,sans-serif">${reset ? c.headReset : c.headVerify}</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4a4f5e;font-family:'Segoe UI',Arial,sans-serif">${reset ? c.introReset : c.introVerify}</p>
      <div style="background:#f6f7fa;border:1px solid #e6e8ef;border-radius:14px;padding:18px 16px;text-align:center">
        <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#7a8094;margin-bottom:12px;font-family:'Segoe UI',Arial,sans-serif">${c.yourCode}</div>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" dir="ltr"><tr>${digits}</tr></table>
        <div style="margin-top:14px;font-size:13px;color:#4a4f5e;font-family:'Segoe UI',Arial,sans-serif">${c.valid.replace("{min}", String(minutes))}</div>
      </div>
      <p style="margin:18px 0 6px;font-size:13px;line-height:1.6;color:#4a4f5e;font-family:'Segoe UI',Arial,sans-serif"><b>${c.share}</b></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#7a8094;font-family:'Segoe UI',Arial,sans-serif">${c.ignore}</p>
    </div>`;
}

export function otpEmail(opts: { code: string; minutes: number; reset: boolean; language?: string | null }) {
  const lang: L = opts.language && isL(opts.language) ? opts.language : "en";
  const local = COPY[lang];
  const en = COPY.en;
  const dir = RTL.has(lang) ? "rtl" : "ltr";
  const subject = lang === "en" ? (opts.reset ? en.subjectReset : en.subjectVerify) : `${opts.reset ? local.subjectReset : local.subjectVerify} / ${opts.reset ? en.subjectReset : en.subjectVerify}`;

  const parts = [block(local, opts.code, opts.minutes, opts.reset, dir)];
  if (lang !== "en") parts.push(`<hr style="border:0;border-top:1px solid #e6e8ef;margin:26px 0">` + block(en, opts.code, opts.minutes, opts.reset, "ltr"));

  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#eef0f5">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.code} ${local.valid.replace("{min}", String(opts.minutes))}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef0f5"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e1e4ec">
      <tr><td style="background:#0a0b0f;padding:20px 24px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td style="vertical-align:middle"><img src="${SITE}/icons/icon-192.png" width="40" height="40" alt="" style="display:block;border-radius:10px"></td>
          <td style="vertical-align:middle;padding-left:12px;font-size:22px;font-weight:700;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif">Servigic</td>
        </tr></table>
        <div style="height:3px;width:56px;background:#ffb020;border-radius:3px;margin-top:14px"></div>
      </td></tr>
      <tr><td style="padding:26px 24px 8px">${parts.join("")}</td></tr>
      <tr><td style="padding:18px 24px 24px"><div style="border-top:1px solid #e6e8ef;padding-top:14px;font-size:12px;color:#8a90a3;font-family:'Segoe UI',Arial,sans-serif">${local.footer}<br><a href="${SITE}" style="color:#8a90a3">servigic.com</a></div></td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    opts.reset ? local.headReset : local.headVerify,
    "",
    opts.reset ? local.introReset : local.introVerify,
    "",
    `${local.yourCode}: ${opts.code}`,
    local.valid.replace("{min}", String(opts.minutes)),
    "",
    local.share,
    local.ignore,
    ...(lang !== "en" ? ["", "---", `${en.yourCode}: ${opts.code}`, en.valid.replace("{min}", String(opts.minutes)), en.share] : []),
  ].join("\n");

  return { subject, html, text };
}
