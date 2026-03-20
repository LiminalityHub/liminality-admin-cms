import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';

const POSTS_COLLECTION = 'posts';

export async function fetchPosts() {
  const postsRef = collection(db, POSTS_COLLECTION);
  // Sort by date descending
  const q = query(postsRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function fetchPostById(id) {
  const postRef = doc(db, POSTS_COLLECTION, id);
  const snapshot = await getDoc(postRef);
  
  if (!snapshot.exists()) {
    const error = new Error('Post not found');
    error.status = 404;
    throw error;
  }
  
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function createPost(payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to create a post');
  }

  const now = new Date().toISOString();
  const newPost = {
    ...payload,
    status: payload.status || 'published',
    createdAt: now,
    updatedAt: now,
    authorId: user.uid
  };

  const docRef = await addDoc(collection(db, POSTS_COLLECTION), newPost);
  return {
    id: docRef.id,
    ...newPost
  };
}

export async function updatePost(id, payload) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to update a post');
  }

  const postRef = doc(db, POSTS_COLLECTION, id);
  const updatedData = {
    ...payload,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(postRef, updatedData);
  
  // Return the merged data
  const snapshot = await getDoc(postRef);
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function deletePost(id) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to delete a post');
  }

  const postRef = doc(db, POSTS_COLLECTION, id);
  await deleteDoc(postRef);
  return true;
}
