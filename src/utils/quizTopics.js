/**
 * Detects a quiz topic from the question content using keyword matching.
 */
export const detectQuizTopic = (quiz) => {
    if (quiz?.topic) return quiz.topic;

    const topicSource = `${quiz?.question || ''} ${quiz?.hint || ''} ${quiz?.youtubeQuery || ''}`.toLowerCase();

    if (/(a\/b|landingpage|konversion|conversion|metrik)/i.test(topicSource)) return 'A/B-Testing';
    if (/(eye|heatmap|usability|nulltreffer|suchfeld|navigation)/i.test(topicSource)) return 'Usability & UX';
    if (/(dropshipping|amazon|fba)/i.test(topicSource)) return 'Geschäftsmodelle';
    if (/(k[iï]|künstliche intelligenz|markttrend|budgetallokation|garbage in)/i.test(topicSource)) return 'KI im Vertrieb';
    if (/(sortiment|marge|eigenmarke|warenkorb|bundle|cross[- ]selling|rabatt)/i.test(topicSource)) return 'Sortiment & Ertrag';
    if (/(influencer|pay-per|affiliate|likes)/i.test(topicSource)) return 'Influencer Marketing';
    if (/(uwg|wettbewerb|abmahnung|unterlassung)/i.test(topicSource)) return 'Recht (UWG)';
    if (/(online-shop|wartungsmodus|checkout|zahlungsart|impressum|seo)/i.test(topicSource)) return 'Shop-Einrichtung & Checkout';
    if (/(soziale ziele|sachliche ziele|unternehmensziele|betriebswirtschaft|wiso)/i.test(topicSource)) return 'WiSo Grundlagen';

    return 'Allgemein';
};

/**
 * Groups raw topic strings into normalized topic groups.
 */
export const getQuizTopicGroup = (topic) => {
    const rawTopic = String(topic || '').trim();
    if (!rawTopic) return 'Allgemein';

    if (/auswahlkriterium/i.test(rawTopic)) return 'Auswahlkriterium';
    if (/\bki\b|künstliche intelligenz/i.test(rawTopic)) return 'KI';

    if (/(social media|social-media|instagram|facebook|whatsapp|youtube|pinterest|linkedin|xing|tiktok|kanal-strategie|content-formate|b2b vs)/i.test(rawTopic)) {
        return 'Social Media';
    }

    return rawTopic;
};
