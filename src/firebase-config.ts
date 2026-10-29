// Firebase web configuration is public. Access is enforced by the API and IAM.
// Private service-account, Telegram and Cloudinary credentials never belong here.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAybMFv7TNae9RKrWYOSwd2xqR0DVr9xAo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rositanails.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rositanails',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:566777557346:web:f7db37dc414ee036187c3b'
};
