package com.civicfix.supervisor;

import com.civicfix.admin.dto.AdminUserResponse;
import com.civicfix.common.ApiResponse;
import com.civicfix.common.PagedResponse;
import com.civicfix.complaint.dto.ComplaintResponse;
import com.civicfix.security.UserPrincipal;
import com.civicfix.supervisor.dto.ReassignWorkerRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/supervisor")
public class SupervisorController {

    private final SupervisorService supervisorService;

    public SupervisorController(SupervisorService supervisorService) {
        this.supervisorService = supervisorService;
    }

    @GetMapping("/escalations")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<ComplaintResponse>>> getEscalations(
            @RequestParam(required = false) String ward,
            @RequestParam(required = false) String category,
            @PageableDefault(size = 20) Pageable pageable) {
        PagedResponse<ComplaintResponse> response = supervisorService.getEscalatedComplaints(ward, category, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/complaints/{id}/reassign")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<ComplaintResponse>> reassignWorker(
            @PathVariable String id,
            @Valid @RequestBody ReassignWorkerRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        ComplaintResponse response = supervisorService.reassignWorker(id, request, principal, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Worker reassigned successfully.", response));
    }

    @GetMapping("/workers")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<java.util.List<AdminUserResponse>>> getActiveWorkers() {
        java.util.List<AdminUserResponse> workers = supervisorService.getActiveWorkers();
        return ResponseEntity.ok(ApiResponse.success(workers));
    }
}
