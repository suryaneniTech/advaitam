export function parseInviteEmails(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  }

  return [
    ...new Set(
      String(input || '')
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
