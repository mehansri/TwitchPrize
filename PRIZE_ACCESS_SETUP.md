# Prize Page Access Control Setup

This guide explains how to restrict access to the prize page to only one specific person.

## 🔐 How It Works

The prize page now requires authentication and only allows access to a specific user. Here's how to configure it:

## 📝 Configuration Options

### Option 1: Environment Variables (Recommended)

Add these to your `.env.local` file:

```env
# Set this to the email of the person who should have access
AUTHORIZED_USER_EMAIL=your-actual-email@example.com

# Optional: Set this to the user ID for additional security
AUTHORIZED_USER_ID=your-user-id

# Set to "false" to disable access control (allow everyone)
ENABLE_ACCESS_CONTROL=true
```

### Option 2: Direct Code Edit

Edit `src/lib/config.ts` and change the default values:

```typescript
export const PRIZE_PAGE_CONFIG = {
  AUTHORIZED_USER_EMAIL: "your-actual-email@example.com",
  AUTHORIZED_USER_ID: "your-user-id", 
  ENABLE_ACCESS_CONTROL: true,
};
```

## 🚀 How to Use

1. **Set up the authorized user**: Configure the email/ID of the person who should have access
2. **User registration**: The authorized person needs to register/login to your app
3. **Access control**: Only the configured user can access `/prize`
4. **Others**: Unauthorized users will see an "Access Restricted" message

## 🔄 Disabling Access Control

To temporarily allow everyone access (for testing), set:

```env
ENABLE_ACCESS_CONTROL=false
```

## 🛡️ Security Features

- **Authentication required**: Users must be logged in
- **Email verification**: Checks against the configured email
- **User ID verification**: Additional check against user ID
- **Automatic redirects**: Unauthorized users are redirected away
- **Persistent storage**: Opened prizes are saved per user

## 📱 User Experience

- **Loading state**: Shows while checking authentication
- **Access denied**: Clear message for unauthorized users
- **Seamless access**: Authorized users see the prize page normally
- **Login prompt**: Unauthenticated users are prompted to sign in

## 🔧 Troubleshooting

1. **User can't access**: Check that the email matches exactly
2. **Login issues**: Ensure NextAuth is properly configured
3. **Environment variables**: Make sure `.env.local` is loaded
4. **User ID**: Get the user ID from your database if needed

## 📊 Database Integration

If you want to store authorized users in the database instead of environment variables, you can modify `src/lib/config.ts` to query your database for authorized users.
