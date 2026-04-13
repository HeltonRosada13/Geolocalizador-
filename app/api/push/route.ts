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
    const { title, body, excludeUser, atmId } = await request.json();

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
      android: {
        priority: 'high' as const,
        notification: {
          icon: 'stock_ticker_update',
          color: '#002244',
          sound: 'default',
          tag: 'flipa-atm-alert',
          clickAction: 'FLIPA_ATM_OPEN',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '2419200', // 4 weeks in seconds (maximum)
        },
        notification: {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'flipa-atm-alert',
          renotify: true,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          actions: [
            { action: 'confirm_yes', title: 'Tem Dinheiro 💰' },
            { action: 'confirm_no', title: 'Não Tem ❌' }
          ],
        },
        fcmOptions: {
          link: '/',
        },
        data: {
          atmId: atmId || '',
          url: '/'
        }
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
