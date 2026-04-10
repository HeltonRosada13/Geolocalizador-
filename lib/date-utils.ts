import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Safely formats a date or Firestore timestamp
 */
export function safeFormatDistanceToNow(date: any, options: { addSuffix?: boolean } = {}): string {
  if (!date) return 'recentemente';

  try {
    let dateObj: Date;

    // Handle Firestore Timestamp
    if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } 
    // Handle plain object {seconds, nanoseconds}
    else if (date && typeof date.seconds === 'number') {
      dateObj = new Date(date.seconds * 1000);
    }
    // Handle Date object or string/number
    else {
      dateObj = new Date(date);
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'recentemente';
    }

    return formatDistanceToNow(dateObj, { 
      addSuffix: options.addSuffix ?? true, 
      locale: pt 
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'recentemente';
  }
}
