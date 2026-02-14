export function getPayloadType(contentType?: string, body?: unknown, rawBody?: string) {
  const normalized = contentType?.toLowerCase() || '';

  if (normalized.includes('application/json') || normalized.includes('+json')) {
    return 'json';
  }
  if (normalized.includes('xml')) {
    return 'xml';
  }
  if (normalized.includes('text/html')) {
    return 'html';
  }
  if (normalized.includes('text/plain')) {
    return 'text';
  }
  if (normalized.includes('application/x-www-form-urlencoded')) {
    return 'form';
  }
  if (normalized.includes('multipart/form-data')) {
    return 'multipart';
  }
  if (normalized.includes('application/octet-stream')) {
    return 'binary';
  }

  if (rawBody && rawBody.length > 0) {
    return 'text';
  }
  if (typeof body === 'object' && body !== null) {
    return 'json';
  }
  if (typeof body === 'string') {
    return 'text';
  }

  return 'unknown';
}
