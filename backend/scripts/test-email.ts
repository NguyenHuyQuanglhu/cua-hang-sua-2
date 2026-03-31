import 'dotenv/config';
import { EmailNotificationService } from '../src/services/email-notification-service';

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Hiển thị config hiện tại (ẩn password)
  console.log('📧 Email Config:');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  console.log(`Pass: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'Not set'}`);
  console.log(`From: ${process.env.SMTP_FROM}\n`);
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ Email chưa được config. Vui lòng cập nhật file .env');
    console.log('📖 Xem hướng dẫn trong file GMAIL-SETUP.md');
    return;
  }
  
  if (process.env.SMTP_USER.includes('demo') || process.env.SMTP_PASS.includes('demo')) {
    console.log('❌ Vẫn đang dùng config demo. Vui lòng cập nhật thông tin Gmail thật');
    console.log('📖 Xem hướng dẫn trong file GMAIL-SETUP.md');
    return;
  }
  
  try {
    const emailService = new EmailNotificationService();
    
    console.log('📤 Đang gửi email test...');
    
    const success = await emailService.sendEmail({
      to: process.env.SMTP_USER!, // Gửi cho chính mình
      subject: '✅ Test Email từ Cửa Hàng Sữa System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 Email Config Thành Công!</h2>
          <p>Chúc mừng! Hệ thống email của <strong>Cửa Hàng Sữa</strong> đã được cấu hình thành công.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📋 Thông tin test:</h3>
            <ul>
              <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
              <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
              <li><strong>From Email:</strong> ${process.env.SMTP_FROM}</li>
            </ul>
          </div>
          
          <p>Hệ thống sẽ tự động gửi email thông báo khi:</p>
          <ul>
            <li>🔔 Khách hàng nợ quá hạn</li>
            <li>📦 Tồn kho sắp hết</li>
            <li>👤 Đăng ký tài khoản mới</li>
            <li>🔑 Reset mật khẩu</li>
            <li>🛒 Đơn hàng online mới</li>
          </ul>
          
          <hr style="margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Email này được gửi từ hệ thống Cửa Hàng Sữa<br>
            Nếu bạn nhận được email này, có nghĩa là cấu hình Gmail đã thành công! 🎊
          </p>
        </div>
      `
    });
    
    if (success) {
      console.log('✅ Email test đã được gửi thành công!');
      console.log(`📬 Kiểm tra hộp thư của ${process.env.SMTP_USER}`);
      console.log('🎉 Gmail SMTP đã hoạt động!');
    } else {
      console.log('❌ Không thể gửi email. Kiểm tra lại config.');
    }
    
  } catch (error) {
    console.error('❌ Lỗi khi test email:', error);
    console.log('\n🔧 Các bước khắc phục:');
    console.log('1. Kiểm tra email và App Password trong .env');
    console.log('2. Đảm bảo 2-Step Verification đã bật');
    console.log('3. Xem hướng dẫn chi tiết trong GMAIL-SETUP.md');
  }
  
  process.exit(0);
}

testEmail();