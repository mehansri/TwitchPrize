# Discord Webhook Setup for Prize Notifications

This guide explains how to set up Discord webhooks to receive real-time notifications when users make payments and when prizes are opened/delivered.

## 🎯 Why Discord Webhooks?

Discord webhooks are the best choice for this system because:
- **Real-time notifications** - Instant alerts on your phone/computer
- **Rich formatting** - Beautiful embeds with user details and prize info
- **Easy setup** - No complex email server configuration
- **Free and reliable** - Discord webhooks are free and very stable
- **Mobile friendly** - Get notifications on your phone via Discord app

## 📋 Setup Steps

### Step 1: Create a Discord Server (if you don't have one)
1. Open Discord and create a new server or use an existing one
2. Make sure you have admin permissions on the server

### Step 2: Create a Webhook
1. Go to your Discord server
2. Right-click on the channel where you want to receive notifications
3. Select "Edit Channel"
4. Go to the "Integrations" tab
5. Click "Create Webhook"
6. Give it a name like "Prize Bot"
7. Copy the webhook URL (it looks like: `https://discord.com/api/webhooks/123456789/abcdef...`)

### Step 3: Configure Environment Variables
Add this to your `.env.local` file:

```env
# Discord Webhook URL for prize notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### Step 4: Test the Setup
1. Start your application
2. Make a test payment
3. Check your Discord channel for notifications

## 🔔 Notification Types

The system will send the following notifications:

### 1. New Payment Received
- **When**: User completes a payment
- **Info**: User name, email, payment amount, timestamp
- **Action**: Admin needs to open the prize

### 2. Prize Opened
- **When**: Admin opens a prize for a user
- **Info**: User details, prize name, value, admin who opened it
- **Action**: Prize has been randomly selected and assigned

### 3. Prize Delivered
- **When**: Admin marks prize as delivered
- **Info**: User details, prize name, admin who delivered it
- **Action**: Prize has been delivered to the user

### 4. Payment Failed
- **When**: Payment processing fails
- **Info**: User details, error message
- **Action**: Admin should investigate the issue

### 5. Daily Summary
- **When**: Daily summary of prize activities
- **Info**: Pending prizes count, opened today, delivered today
- **Action**: Overview of daily activity

## 🎨 Customization

### Customizing Notification Colors
You can modify the notification colors in `src/lib/discord.ts`:

```typescript
// Colors for different notification types
const colors = {
  newPayment: 0x00ff00,    // Green
  prizeOpened: 0xffa500,   // Orange
  prizeDelivered: 0x008000, // Dark green
  paymentFailed: 0xff0000,  // Red
  systemAlert: 0x0099ff,    // Blue
};
```

### Customizing Notification Content
You can modify the notification messages and fields in the `DiscordNotifier` class in `src/lib/discord.ts`.

## 🔧 Troubleshooting

### Webhook Not Working
1. **Check the URL**: Make sure the webhook URL is correct and complete
2. **Check permissions**: Ensure the webhook has permission to send messages
3. **Check the channel**: Make sure the channel still exists and is accessible
4. **Check environment variables**: Ensure `DISCORD_WEBHOOK_URL` is set correctly

### Notifications Not Appearing
1. **Check console logs**: Look for webhook errors in your application logs
2. **Test webhook manually**: Use a tool like Postman to test the webhook URL
3. **Check Discord server**: Make sure you're looking at the right channel

### Security Considerations
- **Keep webhook URL private**: Don't share your webhook URL publicly
- **Use environment variables**: Always use environment variables for sensitive data
- **Monitor webhook usage**: Discord has rate limits on webhooks

## 📱 Mobile Notifications

To get notifications on your phone:
1. Install the Discord mobile app
2. Enable push notifications for your server
3. Make sure the notification channel is not muted

## 🔄 Alternative Notification Methods

If you prefer not to use Discord, you can easily extend the system to support:

### Email Notifications
- Use a service like SendGrid or AWS SES
- Create email templates for different notification types
- Send emails to admin email addresses

### SMS Notifications
- Use a service like Twilio
- Send SMS alerts for urgent notifications
- Configure phone numbers for different admins

### Slack Notifications
- Similar setup to Discord webhooks
- Use Slack's incoming webhooks
- Configure different channels for different notification types

## 📊 Monitoring and Analytics

The system also creates database records for all notifications, which you can use for:
- Tracking notification history
- Analyzing admin response times
- Generating reports on prize activities
- Auditing prize distributions

## 🚀 Next Steps

Once Discord webhooks are set up:
1. Test the system with a few payments
2. Configure admin access to the prize dashboard
3. Set up additional notification channels if needed
4. Monitor the system for any issues
5. Customize notifications based on your preferences
