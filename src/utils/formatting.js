/**
 * Removes wrapping $ signs and backslash escapes from LaTeX-style text.
 * e.g., "$\\text$" → "text"
 */
export const formatLatex = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/\$([^$]+)\$/g, (match, inner) => inner.replace(/\\\\/g, '').trim());
};
