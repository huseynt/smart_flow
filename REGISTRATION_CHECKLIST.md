# Registration Setup Verification Checklist

Use this checklist to verify your registration process is properly configured.

## Pre-Flight Checks

- [ ] Created `.env.local` file in project root (copy from `.env.local.example`)
- [ ] Filled in Firebase credentials from Firebase Console
- [ ] Restarted development server after creating `.env.local`
- [ ] Firebase Authentication → Sign-in methods → Email/Password is **ENABLED**
- [ ] No typos in Firebase config values

## Test Registration

1. Open app in browser: `http://localhost:3000/register`

2. **Step 1 - Role Selection:**
   - [ ] Can see "Təchizatçı (Supply)" and "Distribyutor (Distribution)" options
   - [ ] Can select one
   - [ ] "Davam et" button appears and works

3. **Step 2 - Details Form:**
   - [ ] Form shows correct fields for your selected role
   - [ ] Try submitting with empty fields → Should see error messages
   - [ ] Try submitting with invalid email → Should see error
   - [ ] Try submitting with password < 6 chars → Should see error

4. **Step 2 - Valid Submission:**
   - [ ] Fill all fields with valid data
   - [ ] Click "Qeydiyyat ol" button
   - [ ] Button should show loading spinner
   - [ ] **Open Browser DevTools → Console**
   - [ ] Look for log messages starting with `"Registration started..."`
   - [ ] After Firebase response:
     - [ ] ✅ Should see `"Step 1 complete: Firebase user created with UID: xxx"`
     - [ ] ✅ Should see `"Step 2 complete: Database user created..."`
     - [ ] ✅ Should see `"Registration complete: User is now authenticated"`
     - [ ] ✅ Should redirect to `/home`

## Troubleshooting

### If Step 1 (Firebase) Fails:
- [ ] Check Console for error message (e.g., "weak-password", "invalid-email", "email-already-in-use")
- [ ] Check `.env.local` values match Firebase Console exactly
- [ ] Check Email/Password authentication is enabled in Firebase

### If Steps 2-3 Appear to Work but No Redirect:
- [ ] This is expected - database services return mock data
- [ ] You'll see logs: `"Step 2 complete"` and `"Step 3 complete"`
- [ ] To fully fix: Implement database operations (see `REGISTRATION_FIX.md` → "Next Steps")

### If Button Never Shows Loading Spinner:
- [ ] Check for form validation errors
- [ ] Open DevTools Console tab and scroll up
- [ ] Look for `"Registration started with data: ..."`
- [ ] If not there, form validation is failing

### If No Console Logs At All:
- [ ] Check DevTools is open to the correct tab: **Console**
- [ ] Make sure you're looking at the app's logs, not browser logs
- [ ] Refresh page and try again
- [ ] Check browser console filter isn't hiding messages

## Quick Firebase Config Test

In browser DevTools Console, run:
```javascript
// Should show your Firebase configuration
console.log(auth.app.options)
```

Should output something like:
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  ...
}
```

If output is empty or undefined → `.env.local` not loaded (restart server)

## Still Having Issues?

1. Check the full guide: [REGISTRATION_FIX.md](./REGISTRATION_FIX.md)
2. Look at these files to understand the flow:
   - [components/auth/RegisterForm.tsx](./components/auth/RegisterForm.tsx) - Form UI
   - [context/AuthContext.tsx](./context/AuthContext.tsx) - Registration logic
   - [lib/firebase.ts](./lib/firebase.ts) - Firebase initialization
   - [lib/auth.ts](./lib/auth.ts) - Firebase Auth functions

