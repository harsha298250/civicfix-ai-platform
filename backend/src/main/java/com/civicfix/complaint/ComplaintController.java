package com.civicfix.complaint;

import com.civicfix.common.ApiResponse;
import com.civicfix.common.PagedResponse;
import com.civicfix.complaint.dto.*;
import com.civicfix.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ComplaintResponse>> createComplaint(
            @Valid @RequestBody CreateComplaintRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        ComplaintResponse response = complaintService.createComplaint(request, principal, httpRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Complaint filed successfully.", response));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PagedResponse<ComplaintResponse>>> getComplaints(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        PagedResponse<ComplaintResponse> response = complaintService.getComplaints(principal, status, category, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ComplaintResponse>> getComplaintById(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ComplaintResponse response = complaintService.getComplaintById(id, principal);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ComplaintHistoryResponse>>> getComplaintHistory(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<ComplaintHistoryResponse> history = complaintService.getComplaintHistory(id, principal);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('OFFICER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ComplaintResponse>> assignWorker(
            @PathVariable String id,
            @Valid @RequestBody AssignComplaintRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        ComplaintResponse response = complaintService.assignWorker(id, request, principal, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Work order dispatched to technician.", response));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ComplaintResponse>> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        ComplaintResponse response = complaintService.transitionStatus(id, request, principal, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Complaint status updated successfully.", response));
    }
}
