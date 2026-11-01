package com.civicfix.officer.dto;

import java.util.List;

public class OfficerTrustAnalyticsResponse {

    private String from;
    private String to;
    private String formula = "confirmed closures / (confirmed closures + citizen rejections + reopened after resolution)";
    private int minimumSampleSizeThreshold = 5;
    private TrustScoreMetric.OverallTrustScore overall;
    private List<TrustScoreMetric.WardTrustScore> byWard;
    private List<TrustScoreMetric.OfficerTrustScore> byOfficer;

    public OfficerTrustAnalyticsResponse() {}

    public OfficerTrustAnalyticsResponse(
            String from,
            String to,
            TrustScoreMetric.OverallTrustScore overall,
            List<TrustScoreMetric.WardTrustScore> byWard,
            List<TrustScoreMetric.OfficerTrustScore> byOfficer
    ) {
        this.from = from;
        this.to = to;
        this.overall = overall;
        this.byWard = byWard;
        this.byOfficer = byOfficer;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getFormula() {
        return formula;
    }

    public void setFormula(String formula) {
        this.formula = formula;
    }

    public int getMinimumSampleSizeThreshold() {
        return minimumSampleSizeThreshold;
    }

    public void setMinimumSampleSizeThreshold(int minimumSampleSizeThreshold) {
        this.minimumSampleSizeThreshold = minimumSampleSizeThreshold;
    }

    public TrustScoreMetric.OverallTrustScore getOverall() {
        return overall;
    }

    public void setOverall(TrustScoreMetric.OverallTrustScore overall) {
        this.overall = overall;
    }

    public List<TrustScoreMetric.WardTrustScore> getByWard() {
        return byWard;
    }

    public void setByWard(List<TrustScoreMetric.WardTrustScore> byWard) {
        this.byWard = byWard;
    }

    public List<TrustScoreMetric.OfficerTrustScore> getByOfficer() {
        return byOfficer;
    }

    public void setByOfficer(List<TrustScoreMetric.OfficerTrustScore> byOfficer) {
        this.byOfficer = byOfficer;
    }
}

