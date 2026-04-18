# Supabase Auth — Branded Email Templates

Paste each section into Supabase → Authentication → Email Templates. Placeholders
like `{{ .ConfirmationURL }}` and `{{ .Email }}` are Supabase's — leave them literal.

---

## Magic Link (primary — used by our /signin flow)

**Subject:**

```
Your Vyvata sign-in link
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Sign in to Vyvata</title></head>
<body style="margin:0;padding:0;background:#0B1F3B;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B1F3B;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:11px;font-weight:700;letter-spacing:4px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;">VYVATA</span>
        </td></tr>
        <tr><td style="background:#112649;border-radius:16px;padding:40px 36px;border:1px solid rgba(201,214,223,0.1);">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:3px;color:#14B8A6;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;">Sign in</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#E8F0F5;font-family:Montserrat,Arial,sans-serif;">Click to sign in to Vyvata</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#7A90A8;line-height:1.6;">This link expires in 15 minutes and only works once. If you didn't request it, you can ignore this email.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#14B8A6,#0F766E);color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;font-family:Montserrat,Arial,sans-serif;text-transform:uppercase;padding:14px 36px;border-radius:10px;text-decoration:none;">Sign in to Vyvata →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 0;font-size:11px;color:#4a6080;line-height:1.5;word-break:break-all;">Or paste this URL into your browser:<br/><a href="{{ .ConfirmationURL }}" style="color:#14B8A6;text-decoration:none;">{{ .ConfirmationURL }}</a></p>
        </td></tr>
        <tr><td style="padding-top:28px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4a6080;">Signing in as <strong style="color:#C9D6DF;">{{ .Email }}</strong> · Vyvata · AI-powered supplement intelligence</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## Confirm signup (used if someone uses password sign-up later; still worth branding)

**Subject:**

```
Confirm your Vyvata account
```

**Body (HTML):**

Same shell as above, with headline "Confirm your email" and body copy "Tap the button below to finish setting up your Vyvata account." The CTA button text should read "Confirm email →".

---

## Reset password (not currently used — magic-link only — but Supabase still sends if triggered)

Mirror the Magic Link template but change:
- subject to "Reset your Vyvata password"
- pre-header "Password reset"
- button text "Reset password →"
- copy "Click below to choose a new password. If you didn't request a reset, ignore this email."

---

## Invite user (not yet used — for future practitioner invites)

Mirror the Magic Link template but change:
- subject to "You're invited to Vyvata"
- pre-header "You're invited"
- headline "{{ .Inviter }} invited you to Vyvata"
- button text "Accept invite →"

---

## Testing the branded magic link

1. Save SMTP settings + template in Supabase
2. In the app, go to `/signin` → enter your own email → submit
3. Check inbox — email should come from `hello@vyvata.com`, styled in Vyvata dark theme
4. Click the button → you land on `/me` signed in

If the email comes from `noreply@mail.supabase.io` instead of `hello@vyvata.com`, the SMTP isn't wired correctly — double-check the password field (it's the Resend API key, not `resend`).
