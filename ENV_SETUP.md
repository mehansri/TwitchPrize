# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database (you already have this)
DATABASE_URL="your-postgresql-connection-string"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Twitch OAuth
TWITCH_CLIENT_ID="your-twitch-client-id"
TWITCH_CLIENT_SECRET="your-twitch-client-secret"

# Generate a secret key with: openssl rand -base64 32
# Or use: https://generate-secret.vercel.app/32

## Twitch OAuth Setup (Optional)

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create a new application
3. Set the OAuth Redirect URLs:
   - `http://localhost:3000/api/auth/callback/twitch` (for development)
   - `https://yourdomain.com/api/auth/callback/twitch` (for production)
4. Copy the Client ID and Client Secret to your `.env.local` file

## Setup Steps

1. **Create `.env.local`** file in the root directory
2. **Add your DATABASE_URL** (you already have this)
3. **Add NEXTAUTH_URL** for your development environment
4. **Generate and add NEXTAUTH_SECRET** for security
5. **Set up Twitch OAuth** (optional but recommended)

## Running the Application

```bash
npm run dev
```

## Available Routes

- `/register` - User signup page
- `/login` - User login page  
- `/dashboard` - Protected dashboard (requires authentication)
- `/api/auth/signup` - Signup API endpoint
- `/api/auth/[...nextauth]` - NextAuth API routes

## Features

✅ **User Registration** - Create new accounts with email/password
✅ **User Login** - Secure authentication with NextAuth
✅ **Twitch OAuth** - Sign in/sign up with Twitch account
✅ **Password Hashing** - Secure password storage with bcrypt
✅ **Session Management** - JWT-based sessions
✅ **Protected Routes** - Dashboard requires authentication
✅ **Database Integration** - PostgreSQL with Prisma ORM
✅ **Modern UI** - Beautiful glassmorphism design

## Database Schema

The application creates the following tables:
- `User` - User accounts with email/password
- `Account` - OAuth provider accounts (for future use)
- `Session` - User sessions
- `VerificationToken` - Email verification tokens (for future use)
