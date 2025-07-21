
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Person type
export interface Person {
  id: string;
  name: string;
  userId: string;
  createdAt: Timestamp;
}

// Medication type
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  reminderTimes: string[];
  userId: string;
  createdAt: Timestamp;
}

// People operations
export const addPerson = async (userId: string, name: string): Promise<Person | null> => {
  try {
    console.log("Adding person to Firestore:", { userId, name });
    
    const personData = {
      name: name.trim(),
      userId: userId,
      createdAt: serverTimestamp()
    };
    
    console.log("Person data to be saved:", personData);
    
    const docRef = await addDoc(collection(db, "people"), personData);
    console.log("Person document written with ID: ", docRef.id);
    
    // Return the person with the generated ID
    const newPerson: Person = {
      id: docRef.id,
      name: name.trim(),
      userId: userId,
      createdAt: Timestamp.now() // Use current timestamp as fallback
    };
    
    console.log("Returning new person:", newPerson);
    return newPerson;
  } catch (error) {
    console.error("Error adding person: ", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const subscribeToPeople = (userId: string, callback: (people: Person[]) => void) => {
  console.log("Setting up people subscription for userId:", userId);
  
  const q = query(
    collection(db, "people"), 
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, 
    (querySnapshot) => {
      console.log("People subscription snapshot received, doc count:", querySnapshot.docs.length);
      
      const people = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Person document data:", { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        } as Person;
      });
      
      console.log("Processed people array:", people);
      callback(people);
    },
    (error) => {
      console.error("Error in people subscription:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
    }
  );
};

// Medications operations
export const addMedication = async (userId: string, medication: Omit<Medication, 'id' | 'userId' | 'createdAt'>): Promise<Medication | null> => {
  try {
    console.log("Adding medication to Firestore:", { userId, medication });
    
    const medicationData = {
      ...medication,
      userId: userId,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "medications"), medicationData);
    console.log("Medication document written with ID: ", docRef.id);
    
    const newMedication: Medication = {
      id: docRef.id,
      ...medication,
      userId: userId,
      createdAt: Timestamp.now()
    };
    
    return newMedication;
  } catch (error) {
    console.error("Error adding medication: ", error);
    throw error;
  }
};

export const subscribeToMedications = (userId: string, callback: (medications: Medication[]) => void) => {
  console.log("Setting up medications subscription for userId:", userId);
  
  const q = query(
    collection(db, "medications"), 
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, 
    (querySnapshot) => {
      console.log("Medications subscription snapshot received, doc count:", querySnapshot.docs.length);
      
      const medications = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as Medication;
      });
      
      console.log("Processed medications array:", medications);
      callback(medications);
    },
    (error) => {
      console.error("Error in medications subscription:", error);
    }
  );
};

export const updateMedication = async (medicationId: string, updates: Partial<Medication>): Promise<void> => {
  try {
    const medicationRef = doc(db, "medications", medicationId);
    await updateDoc(medicationRef, updates);
    console.log("Medication updated successfully");
  } catch (error) {
    console.error("Error updating medication: ", error);
    throw error;
  }
};

export const deleteMedication = async (medicationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "medications", medicationId));
    console.log("Medication deleted successfully");
  } catch (error) {
    console.error("Error deleting medication: ", error);
    throw error;
  }
};
