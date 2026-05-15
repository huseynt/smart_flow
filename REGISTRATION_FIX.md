# Registration Process - Setup & Debugging Guide

## Quick Fix Checklist

### ✅ 1. **Configure Firebase Environment Variables**

The most common reason registration doesn't work is missing Firebase configuration.

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings (gear icon)
4. Copy your Firebase config
5. Create `.env.local` file in the project root with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

6. **Restart the development server** - Environment variables need a server restart to take effect

### ✅ 2. **Enable Email/Password Authentication in Firebase**

In Firebase Console:
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Make sure it shows as enabled (blue toggle)

### ✅ 3. **Check Browser Console for Errors**

Open your browser's Developer Console (F12):
1. Go to **Console** tab
2. Try registering - look for error messages
3. Common errors:
   - `"Firebase configuration is incomplete"` → Fix step 1
   - `"auth/invalid-email"` → Email format is wrong
   - `"auth/weak-password"` → Password must be 6+ characters
   - `"auth/email-already-in-use"` → Email already registered

## Registration Flow Breakdown

### What Happens During Registration:

1. **Step 1: Role Selection**
   - User selects Supply or Distribution role
   - Form moves to Step 2

2. **Step 2: Fill Details**
   - For **Supply**: first_name, last_name, company_name, address, phone, voen, email, password
   - For **Distribution**: first_name, last_name, email, password
   - Form validates all required fields

3. **Step 3: Submit**
   - Creates Firebase Auth account (email/password)
   - Creates database user record
   - Creates role-specific profile
   - Redirects to `/home`

## Debugging Tips

### Enable Detailed Logging
The code now includes detailed console logging. Check the browser console for these messages:
```
"Registration started with data: {...}"
"Step 1: Creating Firebase account for email: xxx"
"Step 1 complete: Firebase user created with UID: xxx"
"Step 2: Creating database user record"
"Step 3: Creating role-specific profile for role: SUPPLY/DISTRIBUTION"
"Registration complete: User is now authenticated"
```

### If "Nothing Happens" on Form Submit:
1. **Check if form has validation errors**
   - Look for red error messages under fields
   - Make sure all required fields are filled

2. **Check Firebase is initialized**
   - Open browser DevTools → Console
   - Look for "Firebase configuration is incomplete" message
   - If yes, go back to step 1 (Configure Environment Variables)

3. **Check network requests**
   - Open DevTools → Network tab
   - Try registering
   - Look for failed requests
   - Firebase Auth requests should go to `identitytoolkit.googleapis.com`

4. **Check button state**
   - When submitting, button should show loading spinner
   - If no spinner, validation might be failing silently

### Test with Console Commands
In browser console, test Firebase is working:
```javascript
// Check if auth is initialized
auth.currentUser
// Should return null (not logged in) or user object

// Check config
console.log(auth.app.options)
// Should show your Firebase config
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Nothing happens" on submit | Firebase not initialized | Set `.env.local` with Firebase config and restart server |
| Validation errors visible | Missing required fields | Fill all fields properly |
| "Email already in use" | Email registered before | Use different email address |
| "Weak password" | Password too short | Use 6+ character password |
| No error shown, no redirect | Database services not implemented | Currently returns mock data - see "Next Steps" |

## Next Steps: Implement Database Operations

Currently, the registration process:
- ✅ Creates Firebase Auth account (works)
- ⏳ Returns mock data for database records (needs implementation)

To fully implement database operations, you need to:
1. Set up Firebase Firestore or Data Connect
2. Implement mutations in:
   - `services/auth.service.ts` - createUser()
   - `services/supply.service.ts` - createSupplyUser()
   - `services/distribution.service.ts` - createDistributionUser()
3. Implement queries in `services/users.service.ts` - getCurrentUser()

## Files Modified

This fix updated:
- ✅ `lib/firebase.ts` - Fixed auth initialization
- ✅ `lib/auth.ts` - Added detailed logging
- ✅ `context/AuthContext.tsx` - Added detailed logging to registration flow
- ✅ `components/auth/RegisterForm.tsx` - Added console logging
- ✅ `.env.local.example` - Template for environment variables

