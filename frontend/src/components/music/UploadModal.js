import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { toast } from '../common/Toast';
import { uploadSong } from '../../api/musicApi';
import { useAuth } from '../../context/AuthContext';

export default function UploadModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.is_admin || user?.isAdmin;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !artistName.trim() || !file) {
      toast('Please provide title, artist and audio file.', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('artist_name', artistName.trim());
      if (albumTitle.trim()) formData.append('album_title', albumTitle.trim());
      formData.append('audio', file);
      if (cover) formData.append('cover', cover);
      
      await uploadSong(formData);
      toast('Song uploaded successfully! Chart generated.', 'success');
      setTitle('');
      setArtistName('');
      setAlbumTitle('');
      setFile(null);
      setCover(null);
      onSuccess?.();
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        toast('Only admins can upload songs. Ask an admin.', 'error');
      } else if (status === 413) {
        toast('File too large.', 'error');
      } else {
        toast(err?.response?.data?.detail || 'Failed to upload song', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload New Song">
      {!isAdmin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Song uploads are restricted to admins. Your account (<strong>{user?.username}</strong>) is not an admin.
            Contact an admin or log in as <code>admin</code> to upload.
          </p>
          <Button variant="ghost" onClick={onClose} fullWidth>Close</Button>
        </div>
      ) : (
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group">
          <label>Song Title *</label>
          <input 
            type="text" 
            className="input" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. My Awesome Track"
            required
          />
        </div>

        <div className="form-group">
          <label>Artist Name *</label>
          <input 
            type="text" 
            className="input" 
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="e.g. Artist Name"
            required
          />
        </div>

        <div className="form-group">
          <label>Album Title (optional)</label>
          <input 
            type="text" 
            className="input" 
            value={albumTitle}
            onChange={(e) => setAlbumTitle(e.target.value)}
            placeholder="e.g. Album Name"
          />
        </div>

        <div className="form-group">
          <label>Audio File (MP3/OGG/WAV/FLAC/M4A) *</label>
          <input 
            type="file" 
            className="input" 
            accept="audio/*,.mp3,.ogg,.wav,.flac,.m4a"
            onChange={(e) => setFile(e.target.files[0])}
            required
            style={{ padding: '0.5rem' }}
          />
        </div>

        <div className="form-group">
          <label>Cover Image (optional)</label>
          <input 
            type="file" 
            className="input" 
            accept="image/*"
            onChange={(e) => setCover(e.target.files[0])}
            style={{ padding: '0.5rem' }}
          />
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          The server will automatically analyze the audio and generate tile charts for Easy/Normal/Hard/Insane.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <Button variant="ghost" onClick={onClose} fullWidth>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} fullWidth>Upload</Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
