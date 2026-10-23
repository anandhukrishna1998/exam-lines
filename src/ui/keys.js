export function keyAction(e, ctx = {}) {
  if (!e) return null;
  if (e.ctrlKey || e.metaKey || e.altKey) return null;

  if (ctx.overlay) {
    if (e.key === 'Escape') {
      return { type: 'close' };
    }
    return null;
  }

  const tag = (e.targetTag || (e.target && e.target.tagName) || '').toUpperCase();
  const isEditable = e.targetEditable || (e.target && e.target.isContentEditable);
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || isEditable) {
    return null;
  }

  if (ctx.view !== 'quiz') return null;

  if (['1', '2', '3', '4', '5'].includes(e.key)) {
    return { type: 'choose', index: Number(e.key) - 1 };
  }

  const keyLower = typeof e.key === 'string' ? e.key.toLowerCase() : '';
  if (keyLower === 'n' || e.key === 'ArrowRight') {
    return { type: 'next' };
  }
  if (keyLower === 'p' || e.key === 'ArrowLeft') {
    return { type: 'prev' };
  }
  if (keyLower === 'f') {
    return { type: 'flag' };
  }

  return null;
}
