import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// console.log("in firebase.config.ts file");
const serviceAccountPath = path.join(process.cwd(), 'config', 'service-account-key.json');
// console.log('Firebase service account path:______________________________', serviceAccountPath);

// Check if Firebase app is already initialized
if (!admin.apps.length) {
  // Check if service account file exists
  if (!fs.existsSync(serviceAccountPath)) {
    console.warn('Firebase service account key not found. Firebase authentication will not work.');
    // Initialize with default credentials (will work if running on GCP)
    admin.initializeApp({
      projectId: 'valenscrypto',
    });
  } else {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'valenscrypto',
    });
  }
}

export default admin;