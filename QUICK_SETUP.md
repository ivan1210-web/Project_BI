# Quick Firebase Setup Guide

## Option 1: Local Development (Recommended)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. **Enable Firestore Database** in your project
4. **Enable Authentication** > **Anonymous authentication**

### Step 2: Get Firebase Config
1. In Firebase Console, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "bengkel-app")
6. Copy the configuration object

### Step 3: Create Environment File
1. Copy `env.example` to `.env`
2. Fill in your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Step 4: Set Firestore Rules
In Firebase Console > Firestore Database > Rules, set:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/spareParts/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 5: Start Development
```bash
npm run dev
```

## Option 2: Canvas Environment

If deploying in Canvas, set these global variables:
- `__firebase_config`: JSON string of Firebase config
- `__app_id`: Your Firebase app ID
- `__initial_auth_token`: (Optional) Custom auth token

## Troubleshooting

- **"Firebase config is not available"**: Check your `.env` file exists and has correct values
- **"Authentication failed"**: Ensure Anonymous authentication is enabled in Firebase Console
- **"Permission denied"**: Check Firestore security rules

For detailed instructions, see `FIREBASE_SETUP.md`. 