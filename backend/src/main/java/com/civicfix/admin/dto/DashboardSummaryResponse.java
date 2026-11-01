package com.civicfix.admin.dto;

import java.util.Map;

public class DashboardSummaryResponse {

    private Map<String, Long> usersByRole;
    private Map<String, Long> complaintsByStatus;
    private long auditEventsLast24h;
    private long totalUsers;
    private long totalComplaints;
    private long pendingApprovalCount;

    public DashboardSummaryResponse() {}

    public DashboardSummaryResponse(
            Map<String, Long> usersByRole,
            Map<String, Long> complaintsByStatus,
            long auditEventsLast24h,
            long totalUsers,
            long totalComplaints,
            long pendingApprovalCount
    ) {
        this.usersByRole = usersByRole;
        this.complaintsByStatus = complaintsByStatus;
        this.auditEventsLast24h = auditEventsLast24h;
        this.totalUsers = totalUsers;
        this.totalComplaints = totalComplaints;
        this.pendingApprovalCount = pendingApprovalCount;
    }

    public Map<String, Long> getUsersByRole() {
        return usersByRole;
    }

    public void setUsersByRole(Map<String, Long> usersByRole) {
        this.usersByRole = usersByRole;
    }

    public Map<String, Long> getComplaintsByStatus() {
        return complaintsByStatus;
    }

    public void setComplaintsByStatus(Map<String, Long> complaintsByStatus) {
        this.complaintsByStatus = complaintsByStatus;
    }

    public long getAuditEventsLast24h() {
        return auditEventsLast24h;
    }

    public void setAuditEventsLast24h(long auditEventsLast24h) {
        this.auditEventsLast24h = auditEventsLast24h;
    }

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getTotalComplaints() {
        return totalComplaints;
    }

    public void setTotalComplaints(long totalComplaints) {
        this.totalComplaints = totalComplaints;
    }

    public long getPendingApprovalCount() {
        return pendingApprovalCount;
    }

    public void setPendingApprovalCount(long pendingApprovalCount) {
        this.pendingApprovalCount = pendingApprovalCount;
    }
}

