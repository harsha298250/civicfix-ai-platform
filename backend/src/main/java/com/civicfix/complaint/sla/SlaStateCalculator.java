package com.civicfix.complaint.sla;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintStatus;

import java.time.Duration;
import java.time.OffsetDateTime;

/**
 * Server-authoritative SLA state calculator.
 * Thresholds:
 * - STOPPED: Terminal status (RESOLVED, REJECTED)
 * - NOT_SET: No slaDueAt
 * - OVERDUE: now > slaDueAt
 * - DUE_SOON: remaining time <= min(25% of total policy window, 4 hours)
 * - ON_TRACK: otherwise
 */
public final class SlaStateCalculator {

    public static final double DUE_SOON_PERCENT_THRESHOLD = 0.25;
    public static final Duration DUE_SOON_MAX_HOURS = Duration.ofHours(4);

    private SlaStateCalculator() {}

    public static SlaState calculate(Complaint c) {
        return calculate(c, OffsetDateTime.now());
    }

    public static SlaState calculate(Complaint c, OffsetDateTime now) {
        if (c == null) {
            return SlaState.NOT_SET;
        }

        // Terminal status or pending citizen confirmation stops SLA clock
        if (c.getStatus() == ComplaintStatus.RESOLVED || c.getStatus() == ComplaintStatus.REJECTED
                || c.getStatus() == ComplaintStatus.PENDING_CITIZEN_CONFIRMATION) {
            return SlaState.STOPPED;
        }

        if (c.getSlaDueAt() == null) {
            return SlaState.NOT_SET;
        }

        OffsetDateTime dueAt = c.getSlaDueAt();
        if (now.isAfter(dueAt)) {
            return SlaState.OVERDUE;
        }

        OffsetDateTime start = c.getCreatedAt() != null ? c.getCreatedAt() : now;
        Duration totalWindow = Duration.between(start, dueAt);
        if (totalWindow.isNegative() || totalWindow.isZero()) {
            return SlaState.OVERDUE;
        }

        Duration remaining = Duration.between(now, dueAt);
        if (remaining.isNegative()) {
            return SlaState.OVERDUE;
        }

        long totalMillis = totalWindow.toMillis();
        long quarterMillis = (long) (totalMillis * DUE_SOON_PERCENT_THRESHOLD);
        Duration percentThreshold = Duration.ofMillis(quarterMillis);

        // Whichever is smaller: 25% of policy window OR 4 hours
        Duration effectiveThreshold = percentThreshold.compareTo(DUE_SOON_MAX_HOURS) < 0
                ? percentThreshold
                : DUE_SOON_MAX_HOURS;

        if (remaining.compareTo(effectiveThreshold) <= 0) {
            return SlaState.DUE_SOON;
        }

        return SlaState.ON_TRACK;
    }
}

