import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../../../firebase-applet-config.json';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (serviceAccount.project_id) {
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
    const { atmId, status, userUid } = await request.json();

    if (!atmId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!admin.apps.length) {
      return NextResponse.json({ error: 'Firebase Admin not configured' }, { status: 500 });
    }

    const firestore = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(firebaseConfig.firestoreDatabaseId)
      : getFirestore();

    const atmRef = firestore.collection('atms').doc(atmId);
    const atmDoc = await atmRef.get();

    if (!atmDoc.exists) {
      return NextResponse.json({ error: 'ATM not found' }, { status: 404 });
    }

    await atmRef.update({
      status,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: userUid || 'system_notification'
    });

    // Log the report
    await firestore.collection('reports').add({
      atmId,
      status,
      userUid: userUid || 'system_notification',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'notification_action'
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update Status API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
