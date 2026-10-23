import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserRole, UserStatus } from '../types';

export const firebaseAuthService = {
  // Register a new volunteer directly into Firebase Auth & Firestore
  async register(data: {
    nome: string;
    email: string;
    password: string;
    telefone?: string;
    funcoes?: string[];
    disponibilidade?: string;
  }): Promise<{ user: User; token: string }> {
    const email = data.email.trim().toLowerCase();
    
    // 1. Create in Firebase Authentication
    const credential = await createUserWithEmailAndPassword(auth, email, data.password);
    const fbUser = credential.user;

    // 2. Update display name
    try {
      await updateProfile(fbUser, { displayName: data.nome });
    } catch {
      // non-critical
    }

    // 3. Save profile in Firestore 'users' collection
    const userProfile: User = {
      id: fbUser.uid,
      nome: data.nome,
      email: email,
      telefone: data.telefone || '',
      perfil: 'voluntario',
      status: 'ativo',
      funcoes: data.funcoes || [],
      departamentos: [],
      disponibilidade: data.disponibilidade || '',
      dataCadastro: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', fbUser.uid), userProfile);
    } catch (firestoreErr) {
      console.warn('Firestore write warning:', firestoreErr);
    }

    const token = await fbUser.getIdToken();
    return { user: userProfile, token };
  },

  // Login with Firebase Auth
  async login(email: string, pass: string): Promise<{ user: User; token: string }> {
    const cleanEmail = email.trim().toLowerCase();

    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (err: any) {
      // If it's the admin and user is not yet created in Firebase Auth, create it now
      if (cleanEmail === 'geovanner13@gmail.com' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
        try {
          credential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          await updateProfile(credential.user, { displayName: 'Geovanner (Coordenador Geral)' });
          
          const adminProfile: User = {
            id: credential.user.uid,
            nome: 'Geovanner (Coordenador Geral)',
            email: cleanEmail,
            telefone: '(11) 98765-4321',
            perfil: 'admin',
            status: 'ativo',
            funcoes: ['func-diretor-tv', 'func-obs'],
            departamentos: ['dep-transmissao', 'dep-foto'],
            disponibilidade: 'Domingos manhã e noite, Quarta-feira',
            dataCadastro: new Date().toISOString(),
            ultimoAcesso: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', credential.user.uid), adminProfile);
          const token = await credential.user.getIdToken();
          return { user: adminProfile, token };
        } catch {
          throw err;
        }
      }
      throw err;
    }

    const fbUser = credential.user;
    const token = await fbUser.getIdToken();

    // Fetch user profile from Firestore
    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data() as User;
        return { user: { ...profile, id: fbUser.uid }, token };
      }
    } catch (docErr) {
      console.warn('Could not read user from Firestore:', docErr);
    }

    // Fallback profile if Firestore doc was not found
    const isOwnerAdmin = cleanEmail === 'geovanner13@gmail.com';
    const fallbackProfile: User = {
      id: fbUser.uid,
      nome: fbUser.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      perfil: (isOwnerAdmin ? 'admin' : 'voluntario') as UserRole,
      status: 'ativo' as UserStatus,
      funcoes: [],
      departamentos: [],
      dataCadastro: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString()
    };

    // Create Firestore document if missing
    try {
      await setDoc(doc(db, 'users', fbUser.uid), fallbackProfile);
    } catch {
      // ignore
    }

    return { user: fallbackProfile, token };
  },

  // Update password and profile
  async updateProfileAndCredentials(data: {
    nome?: string;
    telefone?: string;
    disponibilidade?: string;
    novaSenha?: string;
  }): Promise<void> {
    const currentUser = auth.currentUser;
    if (currentUser) {
      if (data.novaSenha) {
        await updatePassword(currentUser, data.novaSenha);
      }
      if (data.nome) {
        await updateProfile(currentUser, { displayName: data.nome });
      }
      const userRef = doc(db, 'users', currentUser.uid);
      const updateData: any = {};
      if (data.nome) updateData.nome = data.nome;
      if (data.telefone !== undefined) updateData.telefone = data.telefone;
      if (data.disponibilidade !== undefined) updateData.disponibilidade = data.disponibilidade;
      await updateDoc(userRef, updateData);
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  }
};
