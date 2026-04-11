import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (serviceAccount.project_id) {
      if (serviceAccount.project_id !== firebaseConfig.projectId) {
        console.warn(`[Push API] Warning: Service account project ID (${serviceAccount.project_id}) does not match config project ID (${firebaseConfig.projectId})`);
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (e) {
    console.error('Firebase Admin initialization failed:', e);
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, excludeUser } = await request.json();

    if (!admin.apps.length) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }

    // Use the specific database ID from config to avoid NOT_FOUND (Status 5)
    const firestore = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(firebaseConfig.firestoreDatabaseId)
      : getFirestore();

    const tokensSnapshot = await firestore.collection('fcm_tokens').get();
    
    const tokens: string[] = [];
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.token && data.userUid !== excludeUser) {
        tokens.push(data.token);
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'No tokens found' });
    }

    const message = {
      notification: {
        title,
        body,
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    return NextResponse.json({ 
      success: true, 
      successCount: response.successCount,
      failureCount: response.failureCount 
    });

  } catch (error) {
    console.error('Push API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
