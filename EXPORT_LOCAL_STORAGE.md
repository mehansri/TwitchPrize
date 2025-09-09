# Emergency: Export Local Storage Before Update

## ⚠️ CRITICAL: Admin opened prizes without tracking them!

If the admin opened prizes by clicking boxes directly (not using manual prize opener), those prizes are NOT in the database and will be lost when you update.

## Quick Export Steps:

### 1. Open Browser Console
- Press F12 or right-click → Inspect
- Go to Console tab

### 2. Export Current State
Copy and paste this command:
```javascript
console.log(JSON.stringify(localStorage.getItem('mysteryBoxes')));
```

### 3. Save the Output
- Copy the entire output (it will be a long JSON string)
- Save it to a text file named `backup_local_storage.txt`

### 4. Alternative: Get Opened Box Numbers
If you just need the box numbers that were opened:
```javascript
const boxes = JSON.parse(localStorage.getItem('mysteryBoxes'));
const openedBoxes = Object.entries(boxes)
  .filter(([num, box]) => box.opened)
  .map(([num, box]) => ({ boxNum: num, prize: box.prize }));
console.log(JSON.stringify(openedBoxes, null, 2));
```

## After Update:

### Option 1: Manual Recreation
1. Use the manual prize opener for each opened box
2. Create prize claims for each user who "won"
3. This ensures proper tracking

### Option 2: Restore from Backup
1. Load the backup JSON
2. Use it to manually sync the boxes
3. Then create proper prize claims

## Prevention:
- **ALWAYS use manual prize opener** for real prizes
- **Never click boxes directly** unless it's just for testing
- **Use the sync button** after any deployment

## Current Risk:
- Any prizes opened directly will be lost
- Users could potentially get duplicate prizes
- No audit trail for those openings
