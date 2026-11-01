package com.civicfix.complaint;

public enum ComplaintStatus {
    SUBMITTED,
    UNDER_REVIEW,
    ASSIGNED,
    IN_PROGRESS,
    RESOLUTION_SUBMITTED,
    PENDING_CITIZEN_CONFIRMATION,
    RESOLVED,
    REWORK_REQUESTED,
    REOPENED,
    REJECTED;

    public boolean isTerminal() {
        return this == RESOLVED || this == REJECTED;
    }
}
