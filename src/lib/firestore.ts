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
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { Person, Medication } from "../components/MemoryApp";

// People operations
export const addPerson = async (userId: string, person: Omit<Person, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "people"), {
      ...person,
      userId,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding person:", error);
    throw error;
  }
};

export const getPeople = async (userId: string): Promise<Person[]> => {
  try {
    const q = query(
      collection(db, "people"), 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Person));
  } catch (error) {
    console.error("Error getting people:", error);
    return [];
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
      console.log("Snapshot metadata:", {
        hasPendingWrites: querySnapshot.metadata.hasPendingWrites,
        fromCache: querySnapshot.metadata.fromCache
      });

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

      // Fallback: try to get people with a one-time read
      console.log("Subscription failed, falling back to one-time read");
      getPeople(userId).then(fallbackPeople => {
        console.log("Fallback read successful:", fallbackPeople);
        callback(fallbackPeople);
      }).catch(fallbackError => {
        console.error("Fallback read also failed:", fallbackError);
      });
    }
  );
};

// Medications operations
export const addMedication = async (userId: string, medication: Omit<Medication, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "medications"), {
      ...medication,
      userId,
      createdAt: Timestamp.now(),
      startDate: Timestamp.fromDate(medication.startDate),
      endDate: medication.endDate ? Timestamp.fromDate(medication.endDate) : null
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding medication:", error);
    throw error;
  }
};

export const getMedications = async (userId: string): Promise<Medication[]> => {
  try {
    const q = query(
      collection(db, "medications"), 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate ? data.endDate.toDate() : undefined
      } as Medication;
    });
  } catch (error) {
    console.error("Error getting medications:", error);
    return [];
  }
};

export const subscribeToMedications = (userId: string, callback: (medications: Medication[]) => void) => {
  const q = query(
    collection(db, "medications"), 
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (querySnapshot) => {
    const medications = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate ? data.endDate.toDate() : undefined
      } as Medication;
    });
    callback(medications);
  });
};

export const updateMedication = async (medicationId: string, updates: Partial<Medication>) => {
  try {
    const docRef = doc(db, "medications", medicationId);
    const updateData = { ...updates };

    // Convert dates to Timestamps
    if (updateData.startDate) {
      updateData.startDate = Timestamp.fromDate(updateData.startDate as Date);
    }
    if (updateData.endDate) {
      updateData.endDate = Timestamp.fromDate(updateData.endDate as Date);
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error("Error updating medication:", error);
    throw error;
  }
};

export const deleteMedication = async (medicationId: string) => {
  try {
    await deleteDoc(doc(db, "medications", medicationId));
  } catch (error) {
    console.error("Error deleting medication:", error);
    throw error;
  }
};