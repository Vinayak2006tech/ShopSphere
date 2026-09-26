import nodemailer from 'nodemailer';
import { logger } from './logger';
import { NotificationLog } from './notification.model';
import { OrderCreatedEvent, PaymentCompletedEvent, PaymentFailedEvent } from '@shopsphere/shared';

let transporter: nodemailer.Transporter | null = null;

export async function initMailer() {
  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info('Mailer initialized with configured SMTP credentials');
    } else {
      // Create Ethereal test account dynamically for zero-configuration testing!
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info(`Mailer initialized with dynamic Ethereal test account: ${testAccount.user}`);
    }
  } catch (err: any) {
    logger.warn('Failed to initialize Ethereal mailer, using console fallback', { error: err.message });
  }
}

function baseEmailTemplate(title: string, bodyContent: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #FAF7F2;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #1F1B16;
      }
      .wrapper {
        max-width: 600px;
        margin: 40px auto;
        background-color: #FFFFFF;
        border: 1px solid #E8E1D6;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(31, 27, 22, 0.06);
        overflow: hidden;
      }
      .header {
        background-color: #FAF7F2;
        border-bottom: 1px solid #E8E1D6;
        padding: 24px 32px;
        text-align: center;
      }
      .brand {
        font-family: Georgia, serif;
        font-size: 24px;
        color: #1F1B16;
        letter-spacing: 0.5px;
      }
      .content {
        padding: 32px;
        line-height: 1.6;
      }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 4px;
        margin-bottom: 16px;
      }
      .badge-success { background-color: #EBF3ED; color: #3D6B4C; }
      .badge-pending { background-color: #FFF4E5; color: #C1440E; }
      .badge-failed  { background-color: #FDF0ED; color: #A33A2E; }
      .footer {
        padding: 20px 32px;
        border-top: 1px solid #E8E1D6;
        font-size: 12px;
        color: #6B6459;
        text-align: center;
        background-color: #FAF7F2;
      }
      .item-row {
        border-bottom: 1px solid #E8E1D6;
        padding: 12px 0;
        display: flex;
        justify-content: space-between;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <div class="brand">ShopSphere</div>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} ShopSphere Artisanal Goods. Distributed Microservices Demonstration.
      </div>
    </div>
  </body>
  </html>
  `;
}

export async function sendOrderCreatedNotification(event: OrderCreatedEvent) {
  const { orderId, customerEmail, customerName, items, totalAmount, shippingAddress } = event.payload;

  const itemsHtml = items
    .map(
      (item) => `
    <div style="padding: 8px 0; border-bottom: 1px solid #E8E1D6;">
      <strong>${item.productName}</strong> x ${item.quantity} 
      <span style="float: right;">$${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `
    )
    .join('');

  const body = `
    <span class="badge badge-pending">Order Awaiting Payment</span>
    <h2 style="font-family: Georgia, serif; margin-top: 8px;">Thank you for your order, ${customerName}</h2>
    <p style="color: #6B6459;">We have received your order <strong style="color: #1F1B16;">#${orderId}</strong>. Payment is currently being processed by our secure payment gateway.</p>
    
    <div style="background-color: #FAF7F2; border: 1px solid #E8E1D6; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <h4 style="margin: 0 0 12px 0;">Order Summary</h4>
      ${itemsHtml}
      <div style="margin-top: 12px; text-align: right; font-size: 16px; font-weight: bold; color: #C1440E;">
        Total: $${totalAmount.toFixed(2)}
      </div>
    </div>

    <p style="font-size: 13px; color: #6B6459;">
      <strong>Shipping to:</strong> ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}
    </p>
  `;

  await deliverMail({
    to: customerEmail,
    subject: `Order Confirmation #${orderId} - ShopSphere`,
    eventType: 'order.created',
    orderId,
    html: baseEmailTemplate('Order Received', body),
  });
}

export async function sendPaymentCompletedNotification(event: PaymentCompletedEvent) {
  const { orderId, customerEmail, amount, transactionId } = event.payload;

  const body = `
    <span class="badge badge-success">Payment Confirmed</span>
    <h2 style="font-family: Georgia, serif; margin-top: 8px;">Your payment was successful</h2>
    <p style="color: #6B6459;">Payment for order <strong style="color: #1F1B16;">#${orderId}</strong> has been verified. Our artisans will begin preparing your items.</p>
    
    <div style="background-color: #FAF7F2; border: 1px solid #E8E1D6; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <div><strong>Amount Paid:</strong> $${amount.toFixed(2)}</div>
      <div style="margin-top: 6px; font-size: 13px; color: #6B6459;"><strong>Transaction Reference:</strong> ${transactionId}</div>
    </div>
  `;

  await deliverMail({
    to: customerEmail,
    subject: `Receipt for Order #${orderId} - ShopSphere`,
    eventType: 'payment.completed',
    orderId,
    html: baseEmailTemplate('Payment Receipt', body),
  });
}

export async function sendPaymentFailedNotification(event: PaymentFailedEvent) {
  const { orderId, customerEmail, amount, reason } = event.payload;

  const body = `
    <span class="badge badge-failed">Payment Attention Required</span>
    <h2 style="font-family: Georgia, serif; margin-top: 8px;">Payment could not be processed</h2>
    <p style="color: #6B6459;">We were unable to process the payment of <strong>$${amount.toFixed(2)}</strong> for order <strong style="color: #1F1B16;">#${orderId}</strong>.</p>
    <div style="background-color: #FDF0ED; border: 1px solid #F3C7BE; border-radius: 6px; padding: 16px; margin: 20px 0; color: #A33A2E;">
      <strong>Reason:</strong> ${reason}
    </div>
    <p style="font-size: 13px; color: #6B6459;">Please check your payment information in your ShopSphere dashboard or try a different payment method.</p>
  `;

  await deliverMail({
    to: customerEmail,
    subject: `Action Required: Payment Issue for Order #${orderId}`,
    eventType: 'payment.failed',
    orderId,
    html: baseEmailTemplate('Payment Failed', body),
  });
}

async function deliverMail(options: {
  to: string;
  subject: string;
  eventType: string;
  orderId?: string;
  html: string;
}) {
  const from = process.env.FROM_EMAIL || '"ShopSphere Concierge" <orders@shopsphere.artisan>';

  let previewUrl: string | undefined;
  let status: 'SENT' | 'SIMULATED' | 'FAILED' = 'SENT';

  try {
    if (transporter) {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      logger.info(`Email delivered to ${options.to} for [${options.eventType}]`, {
        messageId: info.messageId,
        previewUrl,
      });
      if (previewUrl) {
        logger.info(`✉️ View Live Email Preview: ${previewUrl}`);
      }
    } else {
      status = 'SIMULATED';
      logger.info(`[SIMULATED EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    }
  } catch (err: any) {
    status = 'FAILED';
    logger.error('Failed to send email via SMTP transporter', { error: err.message });
  }

  // Save notification log in MongoDB
  try {
    await NotificationLog.create({
      recipientEmail: options.to,
      subject: options.subject,
      eventType: options.eventType,
      orderId: options.orderId,
      status,
      previewUrl,
      htmlContent: options.html,
    });
  } catch (err: any) {
    logger.error('Failed to save notification log', { error: err.message });
  }
}
