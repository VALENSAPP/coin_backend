"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
console.log("in firebase.config.ts file");
const serviceAccountPath = path.join(process.cwd(), 'config', 'service-account-key.json');
console.log('Firebase service account path:______________________________', serviceAccountPath);
if (!admin.apps.length) {
    if (!fs.existsSync(serviceAccountPath)) {
        console.warn('Firebase service account key not found. Firebase authentication will not work.');
        admin.initializeApp({
            projectId: 'valenscrypto',
        });
    }
    else {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'valenscrypto',
        });
    }
}
exports.default = admin;
//# sourceMappingURL=firebase.config.js.map