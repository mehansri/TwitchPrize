# Local Storage Sync Solution

## The Problem
The prize system uses local storage to track which boxes appear opened in the admin interface. This creates a vulnerability where:
- If local storage gets cleared (browser cache, new deployment, etc.), all boxes appear unopened
- Users could potentially open the same prize twice
- The database tracks actual prize claims, but the UI relies on local storage

## The Solution
We've implemented a database sync system that:

### 1. **Auto-Sync on Load**
- When the admin page loads, it automatically syncs with the database
- Restores opened boxes from actual prize claims
- Ensures consistency between local storage and database

### 2. **Manual Sync Button**
- Added a "🔄 Sync with Database" button
- Allows manual syncing if auto-sync fails
- Shows how many opened prizes were found

### 3. **API Endpoint**
- Created `/api/admin/prize-claims` endpoint
- Fetches all opened prize claims from database
- Transforms data to match local storage format

## How to Use

### After a Deployment
1. **Auto-sync happens automatically** when you load the page
2. **If boxes still appear unopened**, click the "🔄 Sync with Database" button
3. **Verify the count** - it should show the correct number of opened prizes

### Manual Recovery
If local storage is completely lost:
1. Click "🔄 Sync with Database"
2. The system will restore all opened boxes from the database
3. Check the alert message to confirm the number of restored prizes

## Technical Details

### Database Schema
- `PrizeClaim` table stores all opened prizes with status `OPENED`
- Each claim includes the box number in the notes field
- Prize types are stored separately with values and glow colors

### Sync Process
1. Fetch all `OPENED` prize claims from database
2. Extract box numbers from notes (e.g., "box #123")
3. Merge with current local storage data
4. Mark corresponding boxes as opened
5. Save back to local storage

### Safety Features
- **No duplicate prizes**: Database prevents multiple claims for same payment
- **Audit trail**: All prize openings are logged with admin user and timestamp
- **Error handling**: Graceful fallback if sync fails

## Best Practices

1. **Always sync after deployments** - Click the sync button to be safe
2. **Check the warning message** - It appears when sync might be needed
3. **Monitor the count** - Ensure opened count matches database records
4. **Backup database regularly** - Prize claims are the source of truth

## Troubleshooting

### Sync Button Not Working
- Check browser console for errors
- Verify admin permissions
- Ensure database connection is working

### Wrong Box Numbers
- Box numbers are extracted from admin notes
- If notes don't contain box numbers, sequential numbering is used
- Manual correction may be needed for older claims

### Missing Prizes
- Check if prize types exist in database
- Verify prize claim status is `OPENED`
- Look for any database connection issues
