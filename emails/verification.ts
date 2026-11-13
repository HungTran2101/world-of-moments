const EMAIL_COPY = {
  en: {
    subject: "A small step before leaving your thought",
    title: "A place for your thoughts",
    intro:
      "Before you leave a little part of your day on the map, please confirm this email belongs to you.",
    button: "Verify my email",
    deadline:
      "Please verify within seven days of registration. After that, your unverified account will be deleted.",
    fallback: "If the button does not open, copy this link into your browser:",
    ignore: "If you did not create this account, you can let this message pass.",
  },
  vi: {
    subject: "Một bước nhỏ trước khi gửi suy nghĩ",
    title: "Một nơi dành cho suy nghĩ của bạn",
    intro:
      "Trước khi để lại một chút của ngày hôm nay trên bản đồ, hãy xác nhận địa chỉ email này thuộc về bạn.",
    button: "Xác minh email của tôi",
    deadline:
      "Vui lòng xác minh trong vòng bảy ngày kể từ khi đăng ký. Sau đó, tài khoản chưa xác minh sẽ được xóa.",
    fallback: "Nếu nút không mở được, hãy sao chép liên kết này vào trình duyệt:",
    ignore: "Nếu bạn không tạo tài khoản này, bạn có thể bỏ qua email.",
  },
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
export function verificationEmail(url: string, locale: "en" | "vi") {
  const copy = EMAIL_COPY[locale];
  const safeUrl = escapeHtml(url);
  return {
    subject: copy.subject,
    text: `World of Moments\n\n${copy.title}\n\n${copy.intro}\n\n${copy.button}: ${url}\n\n${copy.deadline}\n\n${copy.ignore}`,
    html: `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:32px 16px;background:#f3f0ff;color:#34314f;font-family:Georgia,serif"><table role="presentation" style="width:100%;max-width:560px;margin:auto;border-spacing:0;background:#fffdf9;border:1px solid #e4def4;border-radius:24px"><tr><td style="padding:40px 32px"><p style="margin:0 0 28px;color:#7660c5;font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px">WORLD OF MOMENTS</p><h1 style="font-size:28px;font-weight:normal;line-height:1.4">${copy.title}</h1><p style="font-size:17px;line-height:1.8">${copy.intro}</p><p style="margin:32px 0"><a href="${safeUrl}" style="display:inline-block;padding:16px 24px;border-radius:24px;background:#765ff8;color:#fff;text-decoration:none;font-family:Arial,sans-serif">${copy.button}</a></p><p style="font-size:14px;line-height:1.8;color:#77718b">${copy.deadline}</p><hr style="border:0;border-top:1px solid #e4def4;margin:28px 0"><p style="font-size:13px;line-height:1.7;color:#77718b">${copy.fallback}<br><a href="${safeUrl}" style="color:#7660c5;word-break:break-all">${safeUrl}</a></p><p style="font-size:13px;line-height:1.7;color:#77718b">${copy.ignore}</p></td></tr></table></body></html>`,
  };
}
