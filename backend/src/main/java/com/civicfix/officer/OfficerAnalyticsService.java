package com.civicfix.officer;

import com.civicfix.common.exception.BadRequestException;
import com.civicfix.officer.dto.OfficerAnalyticsSummaryResponse;
import com.civicfix.officer.dto.OfficerAnalyticsSummaryResponse.AiAdjudicationCounts;
import com.civicfix.officer.dto.OfficerAnalyticsSummaryResponse.WardCategoryCount;
import com.civicfix.officer.dto.OfficerTrustAnalyticsResponse;
import com.civicfix.officer.dto.PublicTrustAnalyticsResponse;
import com.civicfix.officer.dto.TrustScoreMetric;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class OfficerAnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(OfficerAnalyticsService.class);

    private final JdbcTemplate jdbcTemplate;

    public OfficerAnalyticsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Compute comprehensive municipal operational analytics summary directly via PostgreSQL aggregates.
     * Never loads complaint entities into memory.
     */
    public OfficerAnalyticsSummaryResponse getAnalyticsSummary(String fromStr, String toStr, String ward, String category) {
        OffsetDateTime from = parseDateTime(fromStr, false);
        OffsetDateTime to = parseDateTime(toStr, true);

        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("Parameter 'from' must be before or equal to 'to'");
        }

        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        List<Object> paramsList = new ArrayList<>();

        if (from != null) {
            where.append(" AND c.created_at >= ? ");
            paramsList.add(Timestamp.from(from.toInstant()));
        }
        if (to != null) {
            where.append(" AND c.created_at <= ? ");
            paramsList.add(Timestamp.from(to.toInstant()));
        }
        if (ward != null && !ward.isBlank() && !ward.equalsIgnoreCase("ALL")) {
            where.append(" AND LOWER(c.ward) = LOWER(?) ");
            paramsList.add(ward.trim());
        }
        if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
            where.append(" AND LOWER(c.category) = LOWER(?) ");
            paramsList.add(category.trim());
        }

        Object[] params = paramsList.toArray();
        String whereClause = where.toString();

        // 1. Status Counts
        String sqlStatus = "SELECT c.status, COUNT(*) AS cnt FROM complaints c " + whereClause + " GROUP BY c.status";
        Map<String, Long> countsByStatus = new LinkedHashMap<>();
        jdbcTemplate.query(sqlStatus, rs -> {
            countsByStatus.put(rs.getString("status"), rs.getLong("cnt"));
        }, params);

        long totalComplaints = countsByStatus.values().stream().mapToLong(Long::longValue).sum();

        // 2. Ward Counts
        String sqlWard = "SELECT COALESCE(c.ward, 'Unknown') AS ward_name, COUNT(*) AS cnt FROM complaints c "
                + whereClause + " GROUP BY c.ward ORDER BY cnt DESC";
        Map<String, Long> countsByWard = new LinkedHashMap<>();
        jdbcTemplate.query(sqlWard, rs -> {
            countsByWard.put(rs.getString("ward_name"), rs.getLong("cnt"));
        }, params);

        // 3. Category Counts
        String sqlCategory = "SELECT c.category, COUNT(*) AS cnt FROM complaints c "
                + whereClause + " GROUP BY c.category ORDER BY cnt DESC";
        Map<String, Long> countsByCategory = new LinkedHashMap<>();
        jdbcTemplate.query(sqlCategory, rs -> {
            countsByCategory.put(rs.getString("category"), rs.getLong("cnt"));
        }, params);

        // 4. Ward and Category Breakdown
        String sqlWardCategory = "SELECT COALESCE(c.ward, 'Unknown') AS ward_name, c.category, COUNT(*) AS cnt FROM complaints c "
                + whereClause + " GROUP BY c.ward, c.category ORDER BY ward_name, cnt DESC";
        List<WardCategoryCount> countsByWardAndCategory = jdbcTemplate.query(sqlWardCategory, (rs, rowNum) ->
                new WardCategoryCount(rs.getString("ward_name"), rs.getString("category"), rs.getLong("cnt")), params);

        // 5. Duplicates Linked Count
        String sqlDuplicates = "SELECT COUNT(*) FROM complaints c " + whereClause + " AND c.duplicate_of_id IS NOT NULL";
        Long duplicatesLinked = jdbcTemplate.queryForObject(sqlDuplicates, Long.class, params);
        long dupCount = duplicatesLinked != null ? duplicatesLinked : 0L;

        // 6. AI Adjudication Counts
        String sqlAi = "SELECT UPPER(COALESCE(c.ai_adjudication_status, 'PENDING')) AS adj_status, COUNT(*) AS cnt FROM complaints c "
                + whereClause + " GROUP BY c.ai_adjudication_status";
        Map<String, Long> aiMap = new HashMap<>();
        jdbcTemplate.query(sqlAi, rs -> {
            aiMap.put(rs.getString("adj_status"), rs.getLong("cnt"));
        }, params);

        AiAdjudicationCounts aiAdjudicationCounts = new AiAdjudicationCounts(
                aiMap.getOrDefault("ACCEPTED", 0L),
                aiMap.getOrDefault("OVERRIDDEN", 0L),
                aiMap.getOrDefault("DISMISSED", 0L),
                aiMap.getOrDefault("PENDING", 0L)
        );

        // 7. Average and Median Resolution Hours (created_at to RESOLVED using complaint_status_history)
        String sqlResHours = """
            WITH first_resolutions AS (
                SELECT 
                    c.id,
                    c.created_at AS complaint_created_at,
                    MIN(csh.created_at) AS resolved_at
                FROM complaints c
                JOIN complaint_status_history csh ON csh.complaint_id = c.id
                """ + whereClause + """
                  AND csh.new_status = 'RESOLVED'
                GROUP BY c.id, c.created_at
            )
            SELECT 
                AVG(EXTRACT(EPOCH FROM (resolved_at - complaint_created_at)) / 3600.0) AS avg_hours,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - complaint_created_at)) / 3600.0) AS median_hours
            FROM first_resolutions
        """;

        Double[] resHours = jdbcTemplate.query(sqlResHours, rs -> {
            if (rs.next()) {
                Double avg = rs.getObject("avg_hours") != null ? rs.getDouble("avg_hours") : null;
                Double med = rs.getObject("median_hours") != null ? rs.getDouble("median_hours") : null;
                return new Double[]{ avg, med };
            }
            return new Double[]{ null, null };
        }, params);

        Double avgResolutionHours = resHours != null && resHours[0] != null
                ? Math.round(resHours[0] * 10.0) / 10.0 : null;
        Double medianResolutionHours = resHours != null && resHours[1] != null
                ? Math.round(resHours[1] * 10.0) / 10.0 : null;

        // 8. Rework Rate: complaints with REWORK_REQUESTED / complaints evaluated (RESOLVED + REWORK_REQUESTED)
        String sqlRework = """
            WITH filtered_complaints AS (
                SELECT c.id FROM complaints c """ + whereClause + """
            ),
            events AS (
                SELECT csh.new_status, csh.complaint_id
                FROM complaint_status_history csh
                JOIN filtered_complaints fc ON fc.id = csh.complaint_id
            )
            SELECT 
                COUNT(DISTINCT CASE WHEN he.new_status = 'REWORK_REQUESTED' THEN he.complaint_id END) AS rework_cnt,
                COUNT(DISTINCT CASE WHEN he.new_status IN ('RESOLVED', 'REWORK_REQUESTED', 'PENDING_CITIZEN_CONFIRMATION') THEN he.complaint_id END) AS verified_cnt
            FROM events he
        """;

        Double reworkRate = jdbcTemplate.query(sqlRework, rs -> {
            if (rs.next()) {
                long reworkCnt = rs.getLong("rework_cnt");
                long verifiedCnt = rs.getLong("verified_cnt");
                if (verifiedCnt > 0) {
                    return Math.round(((double) reworkCnt * 100.0 / verifiedCnt) * 10.0) / 10.0;
                }
            }
            return 0.0;
        }, params);

        // 9. SLA Adherence: Return null when no formal SLA engine is configured
        Double slaAdherenceRate = null;

        log.debug("Computed analytics summary: totalComplaints={}, avgHours={}, reworkRate={}%",
                totalComplaints, avgResolutionHours, reworkRate);

        return new OfficerAnalyticsSummaryResponse(
                totalComplaints,
                countsByStatus,
                countsByWard,
                countsByCategory,
                countsByWardAndCategory,
                avgResolutionHours,
                medianResolutionHours,
                reworkRate,
                dupCount,
                aiAdjudicationCounts,
                slaAdherenceRate
        );
    }

    /**
     * Compute Closure Trust Scores per ward and per officer over a selectable date range using SQL aggregates.
     * 
     * Formula: confirmed closures / (confirmed closures + citizen rejections + reopened after resolution)
     * Rule: Return null with "Not enough data (< 5 closures)" when fewer than 5 closures exist.
     */
    public OfficerTrustAnalyticsResponse getClosureTrustScores(String fromStr, String toStr, String wardFilter) {
        OffsetDateTime from = parseDateTime(fromStr, false);
        OffsetDateTime to = parseDateTime(toStr, true);

        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("Parameter 'from' must be before or equal to 'to'");
        }

        StringBuilder whereBuilder = new StringBuilder();
        List<Object> paramsList = new ArrayList<>();

        if (from != null) {
            whereBuilder.append(" AND csh.created_at >= ? ");
            paramsList.add(Timestamp.from(from.toInstant()));
        }
        if (to != null) {
            whereBuilder.append(" AND csh.created_at <= ? ");
            paramsList.add(Timestamp.from(to.toInstant()));
        }
        if (wardFilter != null && !wardFilter.isBlank() && !wardFilter.equalsIgnoreCase("ALL")) {
            whereBuilder.append(" AND LOWER(c.ward) = LOWER(?) ");
            paramsList.add(wardFilter.trim());
        }

        Object[] params = paramsList.toArray();
        String extraWhere = whereBuilder.toString();

        String cte = """
            WITH closure_events AS (
                SELECT 
                    csh.id AS history_id,
                    csh.complaint_id,
                    csh.created_at AS event_time,
                    c.ward,
                    COALESCE(c.assigned_officer_id, (
                        SELECT csh_v.changed_by_user_id 
                        FROM complaint_status_history csh_v 
                        WHERE csh_v.complaint_id = c.id 
                          AND csh_v.new_status = 'PENDING_CITIZEN_CONFIRMATION' 
                          AND csh_v.changed_by_user_id IS NOT NULL 
                        ORDER BY csh_v.created_at DESC 
                        LIMIT 1
                    )) AS officer_id,
                    CASE 
                        WHEN csh.new_status = 'RESOLVED' THEN 'CONFIRMED'
                        WHEN csh.previous_status = 'PENDING_CITIZEN_CONFIRMATION' AND csh.new_status = 'REOPENED' THEN 'REJECTED'
                        WHEN csh.previous_status = 'RESOLVED' AND csh.new_status = 'REOPENED' THEN 'REOPENED'
                        ELSE NULL
                    END AS event_type
                FROM complaint_status_history csh
                JOIN complaints c ON c.id = csh.complaint_id
                WHERE (
                    csh.new_status = 'RESOLVED'
                    OR (csh.previous_status = 'PENDING_CITIZEN_CONFIRMATION' AND csh.new_status = 'REOPENED')
                    OR (csh.previous_status = 'RESOLVED' AND csh.new_status = 'REOPENED')
                )
                """ + extraWhere + """
            )
        """;

        // 1. Overall Trust Score
        String sqlOverall = cte + """
            SELECT 
                COUNT(CASE WHEN ce.event_type = 'CONFIRMED' THEN 1 END) AS confirmed_cnt,
                COUNT(CASE WHEN ce.event_type = 'REJECTED' THEN 1 END) AS rejected_cnt,
                COUNT(CASE WHEN ce.event_type = 'REOPENED' THEN 1 END) AS reopened_cnt
            FROM closure_events ce
        """;

        TrustScoreMetric.OverallTrustScore overall = jdbcTemplate.query(sqlOverall, rs -> {
            if (rs.next()) {
                long conf = rs.getLong("confirmed_cnt");
                long rej = rs.getLong("rejected_cnt");
                long reop = rs.getLong("reopened_cnt");
                long total = conf + rej + reop;
                Double score = calculateScore(conf, total);
                String msg = total >= 5 ? "Calculated" : "Not enough data (< 5 closures)";
                return new TrustScoreMetric.OverallTrustScore(conf, rej, reop, total, score, msg);
            }
            return new TrustScoreMetric.OverallTrustScore(0L, 0L, 0L, 0L, null, "Not enough data (< 5 closures)");
        }, params);

        // 2. Trust Score per Ward
        String sqlWards = cte + """
            SELECT 
                COALESCE(ce.ward, 'Unknown') AS ward_name,
                COUNT(CASE WHEN ce.event_type = 'CONFIRMED' THEN 1 END) AS confirmed_cnt,
                COUNT(CASE WHEN ce.event_type = 'REJECTED' THEN 1 END) AS rejected_cnt,
                COUNT(CASE WHEN ce.event_type = 'REOPENED' THEN 1 END) AS reopened_cnt
            FROM closure_events ce
            GROUP BY COALESCE(ce.ward, 'Unknown')
            ORDER BY ward_name ASC
        """;

        List<TrustScoreMetric.WardTrustScore> byWard = jdbcTemplate.query(sqlWards, (rs, rowNum) -> {
            String ward = rs.getString("ward_name");
            long conf = rs.getLong("confirmed_cnt");
            long rej = rs.getLong("rejected_cnt");
            long reop = rs.getLong("reopened_cnt");
            long total = conf + rej + reop;
            Double score = calculateScore(conf, total);
            String msg = total >= 5 ? "Calculated" : "Not enough data (< 5 closures)";
            return new TrustScoreMetric.WardTrustScore(ward, conf, rej, reop, total, score, msg);
        }, params);

        // 3. Trust Score per Officer
        String sqlOfficers = cte + """
            SELECT 
                u.id AS officer_id,
                u.full_name AS officer_name,
                u.email AS officer_email,
                u.department AS department,
                u.ward AS officer_ward,
                COUNT(CASE WHEN ce.event_type = 'CONFIRMED' THEN 1 END) AS confirmed_cnt,
                COUNT(CASE WHEN ce.event_type = 'REJECTED' THEN 1 END) AS rejected_cnt,
                COUNT(CASE WHEN ce.event_type = 'REOPENED' THEN 1 END) AS reopened_cnt
            FROM closure_events ce
            JOIN users u ON u.id = ce.officer_id
            GROUP BY u.id, u.full_name, u.email, u.department, u.ward
            ORDER BY confirmed_cnt DESC, u.full_name ASC
        """;

        List<TrustScoreMetric.OfficerTrustScore> byOfficer = jdbcTemplate.query(sqlOfficers, (rs, rowNum) -> {
            UUID officerId = (UUID) rs.getObject("officer_id");
            String name = rs.getString("officer_name");
            String email = rs.getString("officer_email");
            String dept = rs.getString("department");
            String oWard = rs.getString("officer_ward");
            long conf = rs.getLong("confirmed_cnt");
            long rej = rs.getLong("rejected_cnt");
            long reop = rs.getLong("reopened_cnt");
            long total = conf + rej + reop;
            Double score = calculateScore(conf, total);
            String msg = total >= 5 ? "Calculated" : "Not enough data (< 5 closures)";
            return new TrustScoreMetric.OfficerTrustScore(officerId, name, email, dept, oWard, conf, rej, reop, total, score, msg);
        }, params);

        return new OfficerTrustAnalyticsResponse(fromStr, toStr, overall, byWard, byOfficer);
    }

    /**
     * Compute Ward-level Closure Trust Scores for the public transparency page.
     * Strictly presents aggregated ward-level statistics with zero officer or staff personal information.
     */
    public PublicTrustAnalyticsResponse getPublicWardTrustScores(String fromStr, String toStr) {
        OfficerTrustAnalyticsResponse internal = getClosureTrustScores(fromStr, toStr, null);
        return new PublicTrustAnalyticsResponse(internal.getFrom(), internal.getTo(), internal.getOverall(), internal.getByWard());
    }

    Double calculateScore(long confirmed, long total) {
        if (total < 5) {
            return null;
        }
        return Math.round(((double) confirmed * 100.0 / total) * 10.0) / 10.0;
    }

    private OffsetDateTime parseDateTime(String input, boolean endOfDay) {
        if (input == null || input.isBlank()) return null;
        try {
            return OffsetDateTime.parse(input);
        } catch (Exception e1) {
            try {
                LocalDate ld = LocalDate.parse(input);
                return endOfDay
                        ? ld.atTime(23, 59, 59, 999999999).atOffset(ZoneOffset.UTC)
                        : ld.atStartOfDay().atOffset(ZoneOffset.UTC);
            } catch (Exception e2) {
                throw new BadRequestException("Invalid date format: '" + input + "'. Expected ISO-8601 (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ).");
            }
        }
    }
}

