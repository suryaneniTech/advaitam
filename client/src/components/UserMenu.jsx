import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserAvatar from './UserAvatar';
import { MoonIcon, SunIcon } from './ThemeToggle';

export default function UserMenu() {
  const { user, logout, uploadAvatar, removeAvatar } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setError('');
    setUploading(true);
    try {
      await removeAvatar();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`user-menu${open ? ' open' : ''}`} ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <UserAvatar user={user} size="sm" />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-header">
            <UserAvatar user={user} size="lg" />
            <div className="user-menu-meta">
              <strong>{user.email?.split('@')[0]}</strong>
              <span className="muted">{user.email}</span>
              {user.role === 'admin' && <span className="user-menu-role">Admin</span>}
            </div>
          </div>

          {error && <div className="user-menu-error">{error}</div>}

          <div className="user-menu-section">
            <button
              type="button"
              className="user-menu-item"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading…' : user.profileImage ? 'Change photo' : 'Upload photo'}
            </button>
            {user.profileImage && (
              <button
                type="button"
                className="user-menu-item user-menu-item-muted"
                disabled={uploading}
                onClick={handleRemove}
              >
                Remove photo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={handleUpload}
            />
          </div>

          <div className="user-menu-divider" />

          <button
            type="button"
            className="user-menu-item user-menu-theme"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            <span className="user-menu-theme-icon" aria-hidden="true">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>

          <div className="user-menu-divider" />

          <button
            type="button"
            className="user-menu-item user-menu-item-danger"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
