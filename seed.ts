import { db } from './lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const initialATMs = [
  {
    bankName: 'BAI',
    locationName: 'Kinaxixi',
    address: 'Luanda Central',
    latitude: -8.8147,
    longitude: 13.2306,
    status: 'disponivel',
    lastReportedAt: new Date(),
  },
  {
    bankName: 'BFA',
    locationName: 'Vila Alice',
    address: 'Rua da Missão',
    latitude: -8.8250,
    longitude: 13.2400,
    status: 'disponivel',
    lastReportedAt: new Date(),
  },
  {
    bankName: 'BIC',
    locationName: 'Maianga',
    address: 'Av. Lenine',
    latitude: -8.8300,
    longitude: 13.2350,
    status: 'sem_papel',
    lastReportedAt: new Date(),
  },
  {
    bankName: 'BFA',
    locationName: 'Talatona',
    address: 'Via AL 15, Belas Business Park',
    latitude: -8.9167,
    longitude: 13.1833,
    status: 'disponivel',
    lastReportedAt: new Date(),
  }
];

export async function seedATMs() {
  const atmsRef = collection(db, 'atms');
  for (const atm of initialATMs) {
    await addDoc(atmsRef, {
      ...atm,
      lastReportedAt: serverTimestamp(),
    });
  }
  console.log('Seed completed');
}
