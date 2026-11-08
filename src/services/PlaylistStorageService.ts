import { ref, uploadString, deleteObject, getDownloadURL, listAll } from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  updateDoc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { storage, db, auth } from '@/config/firebase';

export interface PlaylistConfig {
  incluirFilmes: boolean;
  incluirSeries: boolean;
  incluirTV: boolean;
  apenasAtivos: boolean;
  nomePlaylist: string;
  prefixoCanal: string;
  agruparPorCategoria: boolean;
}

export interface PlaylistStats {
  totalItems: number;
  filmes: number;
  series: number;
  episodios: number;
  fileSize: number;
}

export interface PlaylistMetadata {
  id: string;
  userId: string;
  name: string;
  fileUrl: string;
  filePath: string;
  config: PlaylistConfig;
  stats: PlaylistStats;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

class PlaylistStorageService {
  private playlistsCollection = 'playlists';

  /**
   * Upload playlist M3U to Firebase Storage and save metadata to Firestore
   */
  async uploadPlaylist(
    content: string,
    config: PlaylistConfig,
    stats: PlaylistStats
  ): Promise<PlaylistMetadata> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = config.nomePlaylist.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedName}_${timestamp}.m3u`;
      const filePath = `playlists/${user.uid}/${fileName}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, filePath);
      await uploadString(storageRef, content, 'raw', {
        contentType: 'application/x-mpegurl'
      });

      // Get download URL
      const fileUrl = await getDownloadURL(storageRef);

      // Calculate file size
      const fileSize = new Blob([content]).size;

      // Save metadata to Firestore
      const playlistData = {
        userId: user.uid,
        name: config.nomePlaylist,
        fileUrl,
        filePath,
        config,
        stats: {
          ...stats,
          fileSize
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.playlistsCollection), playlistData);

      return {
        id: docRef.id,
        userId: user.uid,
        name: config.nomePlaylist,
        fileUrl,
        filePath,
        config,
        stats: { ...stats, fileSize },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Erro ao fazer upload da playlist:', error);
      throw error;
    }
  }

  /**
   * Get all playlists for current user
   */
  async getPlaylists(): Promise<PlaylistMetadata[]> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const q = query(
        collection(db, this.playlistsCollection),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const playlists: PlaylistMetadata[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        playlists.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          fileUrl: data.fileUrl,
          filePath: data.filePath,
          config: data.config,
          stats: data.stats,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate()
        });
      });

      return playlists;
    } catch (error) {
      console.error('Erro ao buscar playlists:', error);
      throw error;
    }
  }

  /**
   * Delete playlist from Storage and Firestore
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Get playlist metadata
      const docRef = doc(db, this.playlistsCollection, playlistId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Playlist não encontrada');
      }

      const data = docSnap.data();

      // Verify ownership
      if (data.userId !== user.uid) {
        throw new Error('Sem permissão para deletar esta playlist');
      }

      // Delete from Storage
      const storageRef = ref(storage, data.filePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Erro ao deletar playlist:', error);
      throw error;
    }
  }

  /**
   * Get playlist URL
   */
  async getPlaylistUrl(playlistId: string): Promise<string> {
    try {
      const docRef = doc(db, this.playlistsCollection, playlistId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Playlist não encontrada');
      }

      return docSnap.data().fileUrl;
    } catch (error) {
      console.error('Erro ao buscar URL da playlist:', error);
      throw error;
    }
  }

  /**
   * Regenerate playlist (update with new content)
   */
  async regeneratePlaylist(
    playlistId: string,
    newContent: string,
    stats: PlaylistStats
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Get playlist metadata
      const docRef = doc(db, this.playlistsCollection, playlistId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Playlist não encontrada');
      }

      const data = docSnap.data();

      // Verify ownership
      if (data.userId !== user.uid) {
        throw new Error('Sem permissão para atualizar esta playlist');
      }

      // Delete old file from Storage
      const oldStorageRef = ref(storage, data.filePath);
      await deleteObject(oldStorageRef);

      // Upload new content
      const timestamp = Date.now();
      const sanitizedName = data.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedName}_${timestamp}.m3u`;
      const filePath = `playlists/${user.uid}/${fileName}`;

      const storageRef = ref(storage, filePath);
      await uploadString(storageRef, newContent, 'raw', {
        contentType: 'application/x-mpegurl'
      });

      // Get new download URL
      const fileUrl = await getDownloadURL(storageRef);

      // Calculate file size
      const fileSize = new Blob([newContent]).size;

      // Update Firestore
      await updateDoc(docRef, {
        fileUrl,
        filePath,
        stats: {
          ...stats,
          fileSize
        },
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao regenerar playlist:', error);
      throw error;
    }
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const playlistStorageService = new PlaylistStorageService();
