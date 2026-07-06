import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


async def _send_email(to_email: str, subject: str, html_body: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    def _send():
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

    await asyncio.to_thread(_send)


async def send_reset_password_email(email: str, token: str):
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""\
<html>
<body style="font-family: Arial, sans-serif; background: #f4f0f8; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; text-align: center;">
    <h1 style="color: #7c3aed; margin: 0 0 16px;">EVA</h1>
    <p style="color: #4a4a4a; font-size: 16px;">Recibimos una solicitud para restablecer tu contraseña.</p>
    <p style="margin: 24px 0;">
      <a href="{link}" style="background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; display: inline-block;">
        Restablecer contraseña
      </a>
    </p>
    <p style="color: #888; font-size: 13px;">Si no solicitaste esto, ignora este mensaje.<br>Este enlace expira en 1 hora.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #aaa; font-size: 11px;">EVA — Tu compañera de salud menstrual</p>
  </div>
</body>
</html>
"""
    await _send_email(email, "EVA — Restablecer contraseña", html)


async def send_verification_email(email: str, token: str):
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""\
<html>
<body style="font-family: Arial, sans-serif; background: #f4f0f8; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; text-align: center;">
    <h1 style="color: #7c3aed; margin: 0 0 16px;">EVA</h1>
    <p style="color: #4a4a4a; font-size: 16px;">¡Bienvenida a EVA! Solo falta un paso para activar tu cuenta.</p>
    <p style="margin: 24px 0;">
      <a href="{link}" style="background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; display: inline-block;">
        Verificar mi correo
      </a>
    </p>
    <p style="color: #888; font-size: 13px;">Si no creaste una cuenta en EVA, ignora este mensaje.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #aaa; font-size: 11px;">EVA — Tu compañera de salud menstrual</p>
  </div>
</body>
</html>
"""
    await _send_email(email, "EVA — Verifica tu correo", html)
