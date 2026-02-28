export async function fetchYouTubeVideos(query, apiKey, maxResults = 4) {
    if (!apiKey) {
        console.warn("No YouTube API key provided.");
        return [];
    }

    try {
        const safeQuery = encodeURIComponent(query + " Erklärung IHK"); // Add some context to get better educational videos
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${safeQuery}&maxResults=${maxResults}&key=${apiKey}&relevanceLanguage=de`);

        if (!response.ok) {
            const errorData = await response.json();
            alert("YouTube API Fehler:\n" + (errorData.error?.message || response.status));
            throw new Error(`YouTube API returned ${response.status}`);
        }

        const data = await response.json();
        return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            url: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1`
        }));
    } catch (error) {
        console.error("Error fetching YouTube videos:", error);
        return [];
    }
}
