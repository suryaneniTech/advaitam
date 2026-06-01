import { useEffect, useState } from 'react';
import { api } from '../../api/client';

function generatePassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

function inviteLabel(status) {
  if (status === 'sent') return 'Invite sent';
  if (status === 'expired') return 'Invite expired';
  if (status === 'accepted') return 'Active';
  return 'Manual';
}

function inviteMeta(user) {
  const parts = [inviteLabel(user.inviteStatus)];
  if (user.inviteExpiresAt && user.inviteStatus !== 'accepted') {
    const exp = new Date(user.inviteExpiresAt);
    parts.push(user.inviteStatus === 'expired' ? 'Expired' : `Expires ${exp.toLocaleDateString()}`);
  }
  parts.push(`Created ${new Date(user.createdAt).toLocaleDateString()}`);
  return parts.join(' · ');
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualEmail, setManualEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  const loadUsers = async () => {
    try {
      const { users: list } = await api.getUsers();
      setUsers(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setCreating(true);

    try {
      const { credentials } = await api.createUser(manualEmail, password);
      setSuccess({ type: 'manual', ...credentials });
      setManualEmail('');
      setPassword('');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setInviting(true);

    try {
      const { message, user } = await api.inviteUser(inviteEmail);
      setSuccess({ type: 'invite', message, email: user.email });
      setInviteEmail('');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleTestEmail = async () => {
    if (!inviteEmail.trim()) {
      setError('Enter an email above to send a test message');
      return;
    }

    setError('');
    setSuccess(null);
    setTestingEmail(true);

    try {
      const { message } = await api.testEmail(inviteEmail);
      setSuccess({ type: 'invite', message });
    } catch (err) {
      setError(err.message);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleResend = async (id) => {
    setError('');
    setResendingId(id);

    try {
      const { message } = await api.resendInvite(id);
      setSuccess({ type: 'invite', message });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setResendingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user? They will no longer be able to sign in.')) return;

    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id && u._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const copyCredentials = () => {
    if (!success || success.type !== 'manual') return;
    const text = `Advaitam login\nEmail: ${success.email}\nPassword: ${success.password}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <header className="page-header">
        <h1>User management</h1>
        <p>Invite users by email or create credentials manually.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {success?.type === 'invite' && (
        <div className="alert alert-success">{success.message}</div>
      )}

      <section className="panel">
        <h2>Invite by email</h2>
        <p className="panel-desc muted">
          Sends a Gmail invite with a temporary password. Users sign in with their email address.
        </p>

        <form className="create-form" onSubmit={handleInvite}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={inviting || testingEmail}>
              {inviting ? 'Sending invite…' : 'Send invite'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={inviting || testingEmail || !inviteEmail.trim()}
              onClick={handleTestEmail}
            >
              {testingEmail ? 'Testing…' : 'Test Gmail'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Create manually</h2>
        <p className="panel-desc muted">Create credentials and copy them to share yourself.</p>

        {success?.type === 'manual' && (
          <div className="alert alert-success">
            <div>
              <strong>User created — share these credentials:</strong>
              <div className="credential-box">
                <div><span>Email</span> {success.email}</div>
                <div><span>Password</span> {success.password}</div>
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyCredentials}>
              Copy
            </button>
          </div>
        )}

        <form className="create-form" onSubmit={handleCreate}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-row">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPassword(generatePassword())}
              >
                Generate
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn-secondary" disabled={creating}>
            {creating ? 'Creating…' : 'Create user'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Existing users ({users.length})</h2>

        {loading ? (
          <p className="muted">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="muted">No users yet. Invite someone or create one above.</p>
        ) : (
          <ul className="user-list">
            {users.map((u) => (
              <li key={u.id || u._id} className="user-item">
                <div>
                  <strong>{u.email}</strong>
                  <span className="muted">{inviteMeta(u)}</span>
                </div>
                <div className="user-item-actions">
                  {u.inviteStatus !== 'accepted' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={resendingId === (u.id || u._id)}
                      onClick={() => handleResend(u.id || u._id)}
                    >
                      {resendingId === (u.id || u._id) ? 'Sending…' : 'Resend invite'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(u.id || u._id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
