# Firebase Setup Guide

This application requires Firebase configuration to work properly. Follow these steps to set up Firebase:

## Option 1: Local Development (Recommended for testing)

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Firestore Database in your project
4. **IMPORTANT**: Set up Authentication (Anonymous authentication is required)

### 2. Enable Authentication
1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click **Get started** if you haven't set up authentication yet
3. Go to the **Sign-in method** tab
4. Find **Anonymous** in the list of providers
5. Click on **Anonymous** and toggle the **Enable** switch to ON
6. Click **Save**

### 3. Get Firebase Configuration
1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "bengkel-app")
6. Copy the configuration object

### 4. Create Environment File
Create a `.env` file in the root directory of your project with the following content:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Replace the placeholder values with the actual values from your Firebase configuration.

### 5. Set Up Firestore Security Rules
In your Firebase Console, go to Firestore Database > Rules and set the following rules:

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

## Option 2: Canvas Environment

If you're deploying this application in a Canvas environment, you need to set the following global variables:

- `__firebase_config`: JSON string containing your Firebase configuration
- `__app_id`: Your Firebase app ID
- `__initial_auth_token`: (Optional) Custom authentication token

## Testing the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser
3. Check the browser console for any Firebase-related errors
4. If everything is set up correctly, you should see "Auth setup complete" in the console

## Troubleshooting

### Common Issues:

1. **"Firebase config is not available"**
   - Make sure your `.env` file exists and contains all required variables
   - Ensure the `.env` file is in the root directory of your project
   - Restart your development server after creating the `.env` file

2. **"auth/configuration-not-found" error**
   - **Authentication is not enabled**: Go to Firebase Console > Authentication > Get started
   - **Anonymous authentication is not enabled**: Go to Firebase Console > Authentication > Sign-in method > Anonymous > Enable
   - **Wrong project configuration**: Verify your Firebase configuration values in the `.env` file

3. **"auth/operation-not-allowed" error**
   - Anonymous authentication is not enabled in your Firebase project
   - Go to Firebase Console > Authentication > Sign-in method > Anonymous > Enable

4. **"Permission denied" errors**
   - Check your Firestore security rules
   - Ensure anonymous authentication is enabled in Firebase

5. **"Authentication failed" errors**
   - Verify that Anonymous authentication is enabled in Firebase Console
   - Check that your Firebase project is properly configured

### Debugging Steps

1. **Check browser console** for detailed error messages and configuration logs
2. **Verify Firebase configuration** by checking the console log that shows your project ID and auth domain
3. **Test Firebase connection** by visiting your Firebase project URL: `https://your-project-id.firebaseapp.com`
4. **Check Authentication status** in Firebase Console > Authentication > Users

### Getting Help

If you continue to have issues:
1. Check the browser console for detailed error messages
2. Verify your Firebase configuration values are correct
3. Ensure your Firebase project has the necessary services enabled
4. Make sure Anonymous authentication is enabled in Firebase Console 