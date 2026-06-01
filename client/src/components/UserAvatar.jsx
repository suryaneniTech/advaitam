export function getInitial(email) {
  const local = email?.split('@')[0]?.trim();
  if (!local) return '?';
  return local.charAt(0).toUpperCase();
}

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const initial = user?.initial || getInitial(user?.email);
  const classes = `avatar avatar-${size}${className ? ` ${className}` : ''}`;

  if (user?.profileImage) {
    return (
      <img
        src={user.profileImage}
        alt=""
        className={classes}
      />
    );
  }

  return (
    <span className={`${classes} avatar-fallback`} aria-hidden="true">
      {initial}
    </span>
  );
}
