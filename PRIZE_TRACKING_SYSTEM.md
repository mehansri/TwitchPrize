# 🎁 Prize Tracking and Notification System

This document provides a comprehensive overview of the prize tracking and notification system implemented for your Next.js application.

## 🎯 System Overview

The prize tracking system allows admins to:
- **Track which users have paid** but haven't had their prizes opened yet
- **Open prizes on behalf of users** with random prize selection
- **Track which prizes users received** and their delivery status
- **Receive real-time notifications** via Discord webhooks
- **Manage the entire prize lifecycle** from payment to delivery

## 🏗️ Architecture

### Database Schema
The system uses several new database tables:

#### `PrizeType`
- Stores available prize types with their values and rarity
- Matches the prize pool from the mystery box system
- Includes glow colors for visual categorization

#### `PrizeClaim`
- Links payments to prize claims
- Tracks the status: `PENDING_ADMIN_OPEN` → `OPENED` → `DELIVERED`
- Records who opened the prize and when
- Stores admin notes and delivery information

#### `AdminNotification`
- Stores all system notifications for audit purposes
- Tracks notification types and read status
- Links to users and prize claims

### API Endpoints

#### `/api/admin/prize-claims`
- **GET**: Fetch prize claims with filtering (all, pending, opened, delivered)
- Requires admin authorization
- Returns detailed claim information with user and payment data

#### `/api/admin/open-prize`
- **POST**: Open a prize for a user
- Randomly selects a prize from the weighted prize pool
- Updates claim status and sends notifications
- Records which admin opened the prize

#### `/api/admin/mark-delivered`
- **POST**: Mark a prize as delivered to the user
- Updates claim status to delivered
- Sends delivery notification

### Webhook Integration
- **Stripe webhook** automatically creates prize claims when payments are successful
- **Discord webhook** sends real-time notifications for all prize activities

## 🔔 Notification System

### Discord Webhooks (Recommended)
**Why Discord webhooks are the best choice:**
- ✅ **Real-time notifications** - Instant alerts on phone/computer
- ✅ **Rich formatting** - Beautiful embeds with user details
- ✅ **Easy setup** - No complex email server configuration
- ✅ **Free and reliable** - Discord webhooks are free and stable
- ✅ **Mobile friendly** - Get notifications on your phone

### Notification Types

#### 1. New Payment Received
```
🎁 New Prize Payment Received!
👤 User: John Doe
📧 Email: john@example.com
💰 Amount: $5.00
⏰ Time: 2024-01-15 14:30:00
```

#### 2. Prize Opened
```
🎉 Prize Opened!
👤 User: John Doe
🎁 Prize: Random Pack
💰 Value: $5.00
👨‍💼 Opened By: Admin
```

#### 3. Prize Delivered
```
📦 Prize Delivered!
👤 User: John Doe
🎁 Prize: Random Pack
👨‍💼 Delivered By: Admin
```

#### 4. Payment Failed
```
❌ Payment Failed!
👤 User: John Doe
❌ Error: Card declined
```

#### 5. Daily Summary
```
📊 Daily Prize Summary
⏳ Pending Prizes: 5
🎉 Opened Today: 12
📦 Delivered Today: 8
```

## 🎮 Admin Dashboard

### Features
- **Real-time prize claim tracking** with filtering options
- **One-click prize opening** with random selection
- **Status management** (pending → opened → delivered)
- **Detailed view** of each prize claim
- **Statistics dashboard** showing counts by status
- **Mobile-responsive design** for on-the-go management

### Workflow
1. **User makes payment** → Stripe webhook creates prize claim
2. **Admin receives Discord notification** about new payment
3. **Admin opens admin dashboard** to see pending claims
4. **Admin clicks "Open Prize"** → Random prize selected
5. **Discord notification sent** about prize being opened
6. **Admin marks as delivered** when prize is given to user
7. **Final Discord notification** confirms delivery

## 🔧 Setup Instructions

### 1. Environment Variables
Add to your `.env.local`:
```env
# Discord Webhook URL (see DISCORD_SETUP.md for setup)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Admin access control (see PRIZE_ACCESS_SETUP.md)
AUTHORIZED_USER_EMAIL=your-admin-email@example.com
AUTHORIZED_USER_ID=your-user-id
ENABLE_ACCESS_CONTROL=true
```

### 2. Database Migration
The system automatically creates the necessary database tables:
```bash
npx prisma migrate dev --name add_prize_tracking_system
```

### 3. Discord Webhook Setup
Follow the detailed instructions in `DISCORD_SETUP.md` to:
- Create a Discord server and channel
- Set up a webhook
- Configure the webhook URL in environment variables
- Test the notification system

### 4. Admin Access
Configure admin access in `src/lib/config.ts` or via environment variables:
- Set the authorized admin email
- Set the authorized user ID
- Enable/disable access control as needed

## 📊 Usage Examples

### Scenario 1: New User Payment
1. User visits dashboard and clicks "Unlock Prize for $5"
2. User completes Stripe payment
3. Stripe webhook triggers automatically
4. System creates prize claim with status `PENDING_ADMIN_OPEN`
5. Discord notification sent to admin channel
6. Admin sees notification and opens admin dashboard
7. Admin clicks "Open Prize" for the user
8. System randomly selects prize and updates status to `OPENED`
9. Discord notification sent about prize being opened
10. Admin can later mark as `DELIVERED` when prize is given to user

### Scenario 2: Bulk Prize Management
1. Admin opens admin dashboard
2. Sees list of all pending prize claims
3. Uses filter buttons to view different statuses
4. Clicks "Open Prize" for multiple users
5. System processes each prize opening with random selection
6. Admin tracks delivery status for each prize
7. Marks prizes as delivered when given to users

## 🔒 Security Features

### Access Control
- **Authentication required** for all admin functions
- **Authorization checks** ensure only authorized users can access admin features
- **Session validation** on all API endpoints
- **Environment variable configuration** for admin access

### Data Protection
- **User data privacy** - Only necessary information is exposed
- **Payment security** - Stripe handles all payment processing
- **Webhook security** - Discord webhook URLs kept private
- **Database security** - Proper relationships and constraints

## 📈 Monitoring and Analytics

### Built-in Tracking
- **Payment history** - Track all payments and their status
- **Prize distribution** - See which prizes are most/least common
- **Admin activity** - Track who opened which prizes
- **Response times** - Monitor how quickly prizes are opened
- **Delivery tracking** - Track prize delivery status

### Reporting Capabilities
- **Daily summaries** - Overview of daily prize activities
- **User analytics** - Track user payment patterns
- **Prize analytics** - Analyze prize distribution and values
- **Admin performance** - Track admin response times and activity

## 🚀 Future Enhancements

### Potential Additions
- **Email notifications** as backup to Discord
- **SMS notifications** for urgent alerts
- **Automated prize opening** based on time thresholds
- **Prize inventory management** with stock tracking
- **User prize history** page for users to see their prizes
- **Bulk operations** for opening multiple prizes at once
- **Advanced filtering** and search capabilities
- **Export functionality** for reports and analytics

### Integration Possibilities
- **Slack notifications** as alternative to Discord
- **Zapier integration** for custom workflows
- **Analytics platforms** for detailed reporting
- **Inventory systems** for physical prize tracking
- **Shipping integration** for automatic delivery tracking

## 🛠️ Technical Details

### Technology Stack
- **Next.js 14** - React framework with App Router
- **Prisma** - Database ORM with PostgreSQL
- **NextAuth.js** - Authentication system
- **Stripe** - Payment processing
- **Discord Webhooks** - Real-time notifications
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling and responsive design

### Performance Considerations
- **Database indexing** on frequently queried fields
- **Efficient queries** with proper includes and selects
- **Webhook rate limiting** to respect Discord limits
- **Error handling** for robust operation
- **Caching strategies** for frequently accessed data

## 📞 Support

### Troubleshooting
- Check `DISCORD_SETUP.md` for webhook issues
- Review `PRIZE_ACCESS_SETUP.md` for admin access problems
- Check console logs for API errors
- Verify environment variables are set correctly

### Common Issues
1. **Discord notifications not working** - Check webhook URL and permissions
2. **Admin access denied** - Verify email and user ID configuration
3. **Database errors** - Run migrations and check Prisma setup
4. **Payment issues** - Check Stripe configuration and webhook setup

This system provides a complete solution for tracking prizes from payment to delivery, with real-time notifications and comprehensive admin tools. The Discord webhook system ensures you never miss a payment or prize opening, while the admin dashboard gives you full control over the prize distribution process.
