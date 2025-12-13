export type SupportedVideoProvider = 'youtube' | 'vimeo';

export interface VideoEmbedInfo {
  provider: SupportedVideoProvider;
  embedUrl: string;
}

function normalizeHost(host: string): string {
  const lower = host.toLowerCase();
  return lower.startsWith('www.') ? lower.slice(4) : lower;
}

function extractYouTubeId(url: URL): string | null {
  const host = normalizeHost(url.hostname);

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && id.length === 11 ? id : null;
  }

  // youtube.com/watch?v=<id>
  if (host.endsWith('youtube.com')) {
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      return v && v.length === 11 ? v : null;
    }

    // youtube.com/shorts/<id>, /embed/<id>, /live/<id>
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [kind, id] = parts;
      if (['shorts', 'embed', 'live', 'v'].includes(kind) && id && id.length === 11) {
        return id;
      }
    }
  }

  return null;
}

function extractVimeoId(url: URL): string | null {
  const host = normalizeHost(url.hostname);
  if (!host.endsWith('vimeo.com')) return null;

  // Accept patterns like:
  // vimeo.com/<id>
  // vimeo.com/channels/<channel>/<id>
  // vimeo.com/groups/<group>/videos/<id>
  // player.vimeo.com/video/<id>
  const segments = url.pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (/^\d+$/.test(seg)) return seg;
  }

  return null;
}

export function getVideoEmbedInfo(rawUrl: string): VideoEmbedInfo | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return null;
}

export function isYouTubeOrVimeoUrl(rawUrl: string): boolean {
  return getVideoEmbedInfo(rawUrl) !== null;
}
