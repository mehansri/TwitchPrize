// 🔐 Configuration for prize page access control
export const PRIZE_PAGE_CONFIG = {
  // Set this to the email of the person who should have access
  AUTHORIZED_USER_EMAIL: process.env.AUTHORIZED_USER_EMAIL || "srime4080@gmail.com",
  
  // Optional: Set this to the user ID for additional security
  AUTHORIZED_USER_ID: process.env.AUTHORIZED_USER_ID || "your-user-id",
  
  // Enable/disable access control (set to false to allow everyone)
  ENABLE_ACCESS_CONTROL: process.env.ENABLE_ACCESS_CONTROL !== "false",
};

// Helper function to check if a user is authorized
export function isUserAuthorized(userEmail?: string | null, userId?: string | null): boolean {
  if (!PRIZE_PAGE_CONFIG.ENABLE_ACCESS_CONTROL) {
    return true; // Allow everyone if access control is disabled
  }
  
  return (
    userEmail === PRIZE_PAGE_CONFIG.AUTHORIZED_USER_EMAIL ||
    userId === PRIZE_PAGE_CONFIG.AUTHORIZED_USER_ID
  );
}
