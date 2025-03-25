import React, { useState, useEffect } from 'react';
import { Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ProfileForm from './ProfileForm';
import config from '../config';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin') {
        navigate('/login');
        return;
      }
      setUser(parsedUser);
      setName(parsedUser.name || '');
      setEmail(parsedUser.email || '');
      setAvatarUrl(parsedUser.avatarUrl || null);
    }
  }, [navigate]);

  useEffect(() => {
    return () => setError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('role', 'admin');

      if (avatar && avatar.startsWith('data:image')) {
        const base64Response = await fetch(avatar);
        const blob = await base64Response.blob();
        const mimeType = avatar.split(';')[0].split(':')[1];
        const extension = mimeType.split('/')[1];
        formData.append('avatar', blob, `avatar.${extension}`);
      }

      const response = await fetch(`${config.apiUrl}/admin/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      const updatedUser = { 
        ...user, 
        name, 
        email,
        role: 'admin',
        avatarUrl: data.avatarUrl
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setAvatarUrl(data.avatarUrl);

      window.dispatchEvent(new CustomEvent('userUpdated', { 
        detail: updatedUser 
      }));
      setSuccess('Profile updated successfully');
      
      setTimeout(() => {
        window.location.replace('/admin');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <ProfileForm
        name={name}
        email={email}
        avatar={avatar}
        avatarUrl={avatarUrl}
        loading={loading}
        error={error}
        success={success}
        onNameChange={(e) => setName(e.target.value)}
        onEmailChange={(e) => setEmail(e.target.value)}
        onAvatarChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            if (!file.type.startsWith('image/')) {
              setError('Please select an image file');
              return;
            }
            if (file.size > 1024 * 1024) {
              setError('Image size should be less than 1MB');
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              setAvatar(reader.result);
              setError('');
            };
            reader.onerror = () => {
              setError('Error reading file');
            };
            reader.readAsDataURL(file);
          }
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/admin')}
        title="Edit Admin Profile"
      />
    </Container>
  );
};

export default AdminProfile;
