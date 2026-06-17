package com.signlanguage.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.public-base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${spring.mail.username:noreply@example.com}")
    private String fromEmail;

    @Async
    public void sendVerificationEmail(String toEmail, String username, String token) {
        String verifyUrl = baseUrl + "/api/auth/verify-email?token=" + token;
        String subject = "Verify your S2S account";
        String html = buildVerificationEmailHtml(username, verifyUrl);
        sendHtmlEmail(toEmail, subject, html);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent to {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String buildVerificationEmailHtml(String username, String verifyUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"/></head>
            <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:520px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
                <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Speech to Sign Language</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">Verify your email address</p>
                </div>
                <div style="padding:32px;">
                  <p style="color:#cbd5e1;font-size:15px;margin:0 0 8px;">Hi <strong style="color:#e2e8f0;">%s</strong>,</p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    Welcome to S2S! Please verify your email address to complete your registration and unlock all features.
                  </p>
                  <div style="text-align:center;margin-bottom:24px;">
                    <a href="%s" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:14px;letter-spacing:0.3px;">
                      Verify Email Address
                    </a>
                  </div>
                  <p style="color:#64748b;font-size:12px;text-align:center;margin:0;">
                    This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                  </p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(username, verifyUrl);
    }
}
