/**
 * Groups raw topic strings into normalized topic groups for the UI.
 * This prevents the user from being overwhelmed by too many granular topics.
 */
export const getQuizTopicGroup = (topic) => {
    const t = String(topic || '').trim().toLowerCase();
    
    if (!t || t === 'allgemein' || t === 'quiz allgemein') return 'Allgemein';

    // KPI & Webanalyse
    if (/(kpi|kennzahl|roi|roas|cac|ctr|cpc|cpa|webanalyse|tracking|conversion|analyse-tools|metrik|interpretation|performance)/i.test(t)) {
        return 'KPI & Webanalyse';
    }

    // KI & Innovation
    if (/(ki\b|künstliche intelligenz|intelligenz|algorithmus|digitalisierung|innovation|disposition|integration)/i.test(t)) {
        return 'KI & Innovation';
    }

    // Social Media & Influencer
    if (/(social|media|instagram|facebook|whatsapp|youtube|pinterest|linkedin|xing|tiktok|influencer|plattform|snapchat|meta|kanal|content)/i.test(t)) {
        return 'Social Media';
    }

    // Recht & Datenschutz
    if (/(recht|dsgvo|uwg|urheber|lizenz|abmahnung|wettbewerb|legal|datenschutz|vorgaben)/i.test(t)) {
        return 'Recht & Datenschutz';
    }

    // Customer Journey
    if (/(customer journey|kundenreise|awareness|consideration|decision|purchase|retention|advocacy)/i.test(t)) {
        return 'Customer Journey';
    }

    // E-Mail-Marketing
    if (/(e-mail|newsletter|mail)/i.test(t)) {
        return 'E-Mail-Marketing';
    }

    // Shop-Management & UX
    if (/(ux|usability|shop|checkout|navigation|personal|a\/b|landingpage|sortiment|marge|warenkorb|fba|amazon|geschäftsmodell|ertrag|nulltreffer|suchfeld|kriterium)/i.test(t)) {
        return 'Shop & UX';
    }

    // Marketing-Strategie
    if (/(strategie|zielgruppe|segmentierung|schlagworte|planung|budget|media|lead|kommunikation|branding|positionierung|wettbewerbsbeobachtung)/i.test(t)) {
        return 'Marketing-Strategie';
    }

    // WiSo Grundlagen
    if (/(wiso|grundlagen|vwl|bwl|ziele)/i.test(t)) {
        return 'WiSo Grundlagen';
    }

    return 'Marketing-Strategie'; // Fallback
};

/**
 * Detects a quiz topic from the question content using keyword matching.
 * Returns a string that is then further grouped by getQuizTopicGroup.
 */
export const detectQuizTopic = (quiz) => {
    if (quiz?.topic) return quiz.topic;

    const topicSource = `${quiz?.question || ''} ${quiz?.hint || ''} ${quiz?.youtubeQuery || ''}`.toLowerCase();

    if (/(a\/b|landingpage|konversion|conversion|metrik|kpi|roi|roas|cac|ctr|cpc|cpa|webanalyse)/i.test(topicSource)) return 'KPI & Webanalyse';
    if (/(eye|heatmap|usability|nulltreffer|suchfeld|navigation|shop|checkout)/i.test(topicSource)) return 'Shop & UX';
    if (/(dropshipping|amazon|fba|geschäftsmodell)/i.test(topicSource)) return 'Geschäftsmodelle';
    if (/(k[iï]|künstliche intelligenz|markttrend|budgetallokation|garbage in|algorithmus)/i.test(topicSource)) return 'KI & Innovation';
    if (/(sortiment|marge|eigenmarke|warenkorb|bundle|cross[- ]selling|rabatt)/i.test(topicSource)) return 'Shop & UX';
    if (/(social|media|influencer|pay-per|affiliate|likes|instagram|facebook|tiktok|youtube|kanal)/i.test(topicSource)) return 'Social Media';
    if (/(uwg|wettbewerb|abmahnung|unterlassung|recht|dsgvo|urheber|lizenz)/i.test(topicSource)) return 'Recht & Datenschutz';
    if (/(e-mail|newsletter|mail)/i.test(topicSource)) return 'E-Mail-Marketing';
    if (/(journey|kundenreise)/i.test(topicSource)) return 'Customer Journey';
    if (/(soziale ziele|sachliche ziele|unternehmensziele|betriebswirtschaft|wiso|grundlagen)/i.test(topicSource)) return 'WiSo Grundlagen';

    return 'Allgemein';
};
