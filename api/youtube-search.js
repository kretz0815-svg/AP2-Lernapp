const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// --- Rate Limiting (in-memory, per-IP) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function isRateLimited(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    for (const [key, val] of rateLimitMap) {
        if (now - val.startTime > 5 * 60 * 1000) {
            rateLimitMap.delete(key);
        }
    }

    if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return false;
    }

    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }
    return false;
}

function sanitizeQuery(str, maxLength = 200) {
    return String(str ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .slice(0, maxLength)
        .trim();
}

function normalizeForMatch(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function POST(request) {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';

    if (isRateLimited(clientIp)) {
        return new Response(JSON.stringify({
            error: 'Zu viele Anfragen. Bitte warte einen Moment.'
        }), { status: 429, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({
            error: 'YouTube API-Key nicht konfiguriert. Setze YOUTUBE_API_KEY in den Vercel-Umgebungsvariablen.'
        }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Ungültiger JSON-Body' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    const query = sanitizeQuery(body.query);
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 4, 1), 10);

    if (!query) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // Build query variants for better search results
    const dedupe = (arr) => [...new Set(arr.filter(Boolean))];
    const compactBase = query.split(' ').slice(0, 5).join(' ');
    const queryVariants = dedupe([
        `${query} auf deutsch`,
        `${query} deutsch erklärt`,
        `${query} tutorial deutsch`,
        compactBase && `${compactBase} einfach erklärt deutsch`
    ]);

    const fetchSize = Math.min(Math.max(maxResults * 3, 8), 20);
    let data = null;

    for (const variant of queryVariants) {
        const safeQuery = encodeURIComponent(variant);
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${safeQuery}&maxResults=${fetchSize}&key=${apiKey}&relevanceLanguage=de&regionCode=DE`
        );

        if (!response.ok) {
            console.warn(`YouTube API returned ${response.status}`);
            continue;
        }

        const candidateData = await response.json();
        if ((candidateData?.items || []).length > 0) {
            data = candidateData;
            break;
        }
    }

    if (!data) {
        return new Response(JSON.stringify({ videos: [] }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }

    // Score and rank results (same algorithm as before, now on server)
    const queryTokens = normalizeForMatch(query)
        .toLowerCase()
        .split(/\s+/)
        .filter(token => token.length > 2);

    const scored = (data.items || [])
        .filter(item => item?.id?.videoId && item?.snippet)
        .map(item => {
            const title = item.snippet.title || '';
            const description = item.snippet.description || '';
            const channelTitle = item.snippet.channelTitle || '';
            const haystack = normalizeForMatch(`${title} ${description} ${channelTitle}`);
            const normalizedTitle = normalizeForMatch(title);

            const tokenHits = queryTokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
            const titleHits = queryTokens.reduce((sum, token) => sum + (normalizedTitle.includes(token) ? 1 : 0), 0);
            const eduBonus = /erklär|einfach|grundlagen|tutorial|lernvideo|wirtschaft|e-commerce|shop/i.test(haystack) ? 1 : 0;

            return { item, score: (titleHits * 2) + tokenHits + eduBonus };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(({ item }) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            url: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1`
        }));

    return new Response(JSON.stringify({ videos: scored }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}