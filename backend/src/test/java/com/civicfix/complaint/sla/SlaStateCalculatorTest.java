package com.civicfix.complaint.sla;

import com.civicfix.complaint.Complaint;
import com.civicfix.complaint.ComplaintPriority;
import com.civicfix.complaint.ComplaintStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SlaStateCalculatorTest {

    @Test
    @DisplayName("Null slaDueAt produces NOT_SET state")
    void testNotSetWhenSlaDueAtNull() {
        Complaint complaint = new Complaint();
        complaint.setSlaDueAt(null);
        complaint.setStatus(ComplaintStatus.SUBMITTED);

        SlaState state = SlaStateCalculator.calculate(complaint);
        assertEquals(SlaState.NOT_SET, state);
    }

    @Test
    @DisplayName("Terminal statuses RESOLVED and REJECTED stop the clock (STOPPED state)")
    void testTerminalStatusStopsClock() {
        OffsetDateTime now = OffsetDateTime.now();

        Complaint resolved = new Complaint();
        resolved.setCreatedAt(now.minusDays(2));
        resolved.setSlaDueAt(now.minusHours(5)); // Past due, but resolved!
        resolved.setStatus(ComplaintStatus.RESOLVED);

        assertEquals(SlaState.STOPPED, SlaStateCalculator.calculate(resolved));

        Complaint rejected = new Complaint();
        rejected.setCreatedAt(now.minusDays(1));
        rejected.setSlaDueAt(now.plusHours(10));
        rejected.setStatus(ComplaintStatus.REJECTED);

        assertEquals(SlaState.STOPPED, SlaStateCalculator.calculate(rejected));
    }

    @Test
    @DisplayName("Past slaDueAt for open ticket produces OVERDUE state")
    void testOverdueWhenPastDue() {
        OffsetDateTime now = OffsetDateTime.now();

        Complaint complaint = new Complaint();
        complaint.setCreatedAt(now.minusDays(3));
        complaint.setSlaDueAt(now.minusMinutes(10));
        complaint.setStatus(ComplaintStatus.IN_PROGRESS);

        assertEquals(SlaState.OVERDUE, SlaStateCalculator.calculate(complaint));
    }

    @Test
    @DisplayName("Remaining duration <= min(25% of window, 4 hours) produces DUE_SOON state")
    void testDueSoonThreshold() {
        OffsetDateTime now = OffsetDateTime.now();

        // 48 hour window created 46 hours ago -> 2 hours remaining (<= 4h and <= 12h)
        Complaint complaint = new Complaint();
        complaint.setCreatedAt(now.minusHours(46));
        complaint.setSlaDueAt(now.plusHours(2));
        complaint.setStatus(ComplaintStatus.ASSIGNED);

        assertEquals(SlaState.DUE_SOON, SlaStateCalculator.calculate(complaint));
    }

    @Test
    @DisplayName("Comfortable remaining duration produces ON_TRACK state")
    void testOnTrackWhenPlentyOfTime() {
        OffsetDateTime now = OffsetDateTime.now();

        // 48 hour window created 10 hours ago -> 38 hours remaining
        Complaint complaint = new Complaint();
        complaint.setCreatedAt(now.minusHours(10));
        complaint.setSlaDueAt(now.plusHours(38));
        complaint.setStatus(ComplaintStatus.IN_PROGRESS);

        assertEquals(SlaState.ON_TRACK, SlaStateCalculator.calculate(complaint));
    }
}

