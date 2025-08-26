interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

export class DiscordNotifier {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
    if (!this.webhookUrl) {
      console.warn('Discord webhook URL not configured. Notifications will be logged only.');
    }
  }

  private async sendWebhook(payload: DiscordWebhookPayload): Promise<void> {
    if (!this.webhookUrl) {
      console.log('Discord notification (webhook not configured):', payload);
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to send Discord webhook:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error sending Discord webhook:', error);
    }
  }

  // New payment received - admin needs to open prize
  async notifyNewPayment(userName: string, userEmail: string, paymentAmount: number): Promise<void> {
    const embed: DiscordEmbed = {
      title: '🎁 New Prize Payment Received!',
      description: 'A user has made a payment and is waiting for their prize to be opened.',
      color: 0x00ff00, // Green
      fields: [
        {
          name: '👤 User',
          value: userName || 'Unknown',
          inline: true,
        },
        {
          name: '📧 Email',
          value: userEmail || 'No email',
          inline: true,
        },
        {
          name: '💰 Amount',
          value: `$${(paymentAmount / 100).toFixed(2)}`,
          inline: true,
        },
        {
          name: '⏰ Time',
          value: new Date().toLocaleString(),
          inline: false,
        },
      ],
      footer: {
        text: 'Click the link below to open the prize',
      },
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook({
      content: '🔔 **Admin Action Required** - New prize payment received!',
      embeds: [embed],
      username: 'Prize Bot',
      avatar_url: 'https://cdn.discordapp.com/emojis/1279952661629419520.webp?size=96&quality=lossless',
    });
  }

  // Prize opened by admin
  async notifyPrizeOpened(
    userName: string, 
    userEmail: string, 
    prizeName: string, 
    prizeValue: number,
    adminName: string
  ): Promise<void> {
    const embed: DiscordEmbed = {
      title: '🎉 Prize Opened!',
      description: 'An admin has opened a prize for a user.',
      color: 0xffa500, // Orange
      fields: [
        {
          name: '👤 User',
          value: userName || 'Unknown',
          inline: true,
        },
        {
          name: '📧 Email',
          value: userEmail || 'No email',
          inline: true,
        },
        {
          name: '🎁 Prize',
          value: prizeName,
          inline: true,
        },
        {
          name: '💰 Value',
          value: `$${(prizeValue / 100).toFixed(2)}`,
          inline: true,
        },
        {
          name: '👨‍💼 Opened By',
          value: adminName,
          inline: true,
        },
        {
          name: '⏰ Time',
          value: new Date().toLocaleString(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook({
      content: '✅ **Prize Opened** - User prize has been opened by admin',
      embeds: [embed],
      username: 'Prize Bot',
      avatar_url: 'https://cdn.discordapp.com/emojis/1279952661629419520.webp?size=96&quality=lossless',
    });
  }

  // Prize delivered to user
  async notifyPrizeDelivered(
    userName: string, 
    userEmail: string, 
    prizeName: string,
    adminName: string
  ): Promise<void> {
    const embed: DiscordEmbed = {
      title: '📦 Prize Delivered!',
      description: 'A prize has been delivered to the user.',
      color: 0x008000, // Dark green
      fields: [
        {
          name: '👤 User',
          value: userName || 'Unknown',
          inline: true,
        },
        {
          name: '📧 Email',
          value: userEmail || 'No email',
          inline: true,
        },
        {
          name: '🎁 Prize',
          value: prizeName,
          inline: true,
        },
        {
          name: '👨‍💼 Delivered By',
          value: adminName,
          inline: true,
        },
        {
          name: '⏰ Time',
          value: new Date().toLocaleString(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook({
      content: '📦 **Prize Delivered** - User has received their prize',
      embeds: [embed],
      username: 'Prize Bot',
      avatar_url: 'https://cdn.discordapp.com/emojis/1279952661629419520.webp?size=96&quality=lossless',
    });
  }

  // Payment failed
  async notifyPaymentFailed(userName: string, userEmail: string, error: string): Promise<void> {
    const embed: DiscordEmbed = {
      title: '❌ Payment Failed!',
      description: 'A payment attempt has failed.',
      color: 0xff0000, // Red
      fields: [
        {
          name: '👤 User',
          value: userName || 'Unknown',
          inline: true,
        },
        {
          name: '📧 Email',
          value: userEmail || 'No email',
          inline: true,
        },
        {
          name: '❌ Error',
          value: error,
          inline: false,
        },
        {
          name: '⏰ Time',
          value: new Date().toLocaleString(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook({
      content: '❌ **Payment Failed** - User payment attempt failed',
      embeds: [embed],
      username: 'Prize Bot',
      avatar_url: 'https://cdn.discordapp.com/emojis/1279952661629419520.webp?size=96&quality=lossless',
    });
  }

  // System alert
  async notifySystemAlert(title: string, message: string, severity: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    const colors = {
      info: 0x0099ff,    // Blue
      warning: 0xffa500, // Orange
      error: 0xff0000,   // Red
    };

    const embed: DiscordEmbed = {
      title: `🔔 ${title}`,
      description: message,
      color: colors[severity],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook({
      content: `🔔 **System Alert** - ${title}`,
      embeds: [embed],
      username: 'Prize Bot',
      avatar_url: 'https://cdn.discordapp.com/emojis/1279952661629419520.webp?size=96&quality=lossless',
    });
  }

  // Daily summary of pending prizes
  async notifyDailySummary(pendingCount: number, openedToday: number, deliveredToday: number): Promise<void> {
    const embed: DiscordEmbed = {
      title: '📊 Daily Prize Summary',
      description: 'Summary of prize activities for today.',
      color: 0x0099ff, // Blue
      fields: [
        {
          name: '⏳ Pending Prizes',
          value: pendingCount.toString(),
          inline: true,
        },
        {
          name: '🎉 Opened Today',
          value: openedToday.toString(),
          inline: true,
        },
        {
          name: '📦 Delivered Today',
          value: deliveredToday.toString(),
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook({
      content: '📊 **Daily Summary** - Prize activity summary',
      embeds: [embed],
      username: 'Prize Bot',
      avatar_url: 'https://cdn.discordapp.com/emojis/1279952661629419520.webp?size=96&quality=lossless',
    });
  }
}

// Export singleton instance
export const discordNotifier = new DiscordNotifier();
