package com.civicfix.ai.triage;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Text tokenization and string similarity utilities for duplicate detection
 * and categorical relevance scoring.
 */
public final class TextSimilarityUtils {

    private TextSimilarityUtils() {}

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
            "from", "by", "is", "are", "was", "were", "near", "opposite", "beside",
            "very", "too", "please", "kindly", "urgently", "issue", "problem", "there"
    );

    /**
     * Normalize text and extract meaningful word tokens.
     * Preserves Unicode characters (including Tamil script \p{L}) for multilingual civic reporting.
     * Note: Tamil lexicon translations and stop-words require review by a native Tamil speaker.
     */
    public static Set<String> extractTokens(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptySet();
        }
        return Arrays.stream(text.toLowerCase().replaceAll("[^\\p{L}0-9\\s]", " ").split("\\s+"))
                .map(String::trim)
                .filter(t -> t.length() > 1 && !STOP_WORDS.contains(t))
                .collect(Collectors.toSet());
    }

    /**
     * Compute Jaccard Similarity between two token sets. Range: [0.0, 1.0].
     */
    public static double computeJaccardSimilarity(Set<String> setA, Set<String> setB) {
        if (setA.isEmpty() || setB.isEmpty()) return 0.0;
        Set<String> intersection = new HashSet<>(setA);
        intersection.retainAll(setB);

        Set<String> union = new HashSet<>(setA);
        union.addAll(setB);

        return (double) intersection.size() / union.size();
    }

    /**
     * Compute normalized Levenshtein string similarity. Range: [0.0, 1.0].
     */
    public static double computeLevenshteinSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        String a = s1.trim().toLowerCase();
        String b = s2.trim().toLowerCase();
        if (a.equals(b)) return 1.0;
        if (a.isEmpty() || b.isEmpty()) return 0.0;

        int maxLen = Math.max(a.length(), b.length());
        int distance = computeLevenshteinDistance(a, b);
        return 1.0 - ((double) distance / maxLen);
    }

    /**
     * Standard Dynamic Programming Levenshtein distance.
     */
    public static int computeLevenshteinDistance(String a, String b) {
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            costs[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]),
                        a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[b.length()];
    }

    /**
     * Combined similarity metric weighting token overlap (70%) and edit distance (30%).
     */
    public static double computeCombinedSimilarity(String textA, String textB) {
        if (textA == null || textB == null) return 0.0;
        Set<String> tokensA = extractTokens(textA);
        Set<String> tokensB = extractTokens(textB);

        double jaccard = computeJaccardSimilarity(tokensA, tokensB);
        double levenshtein = computeLevenshteinSimilarity(textA, textB);

        return (jaccard * 0.70) + (levenshtein * 0.30);
    }
}
