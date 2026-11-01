package com.civicfix.complaint;

import com.civicfix.audit.AuditService;
import com.civicfix.common.PagedResponse;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.complaint.dto.ComplaintHistoryResponse;
import com.civicfix.complaint.dto.ComplaintResponse;
import com.civicfix.complaint.dto.UpdateStatusRequest;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.Role;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintServiceWorkerTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @Mock
    private ComplaintStatusHistoryRepository historyRepository;

    @Mock
    private ResolutionEvidenceRepository evidenceRepository;

    @Mock
    private ComplaintPhotoRepository complaintPhotoRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private com.civicfix.storage.StorageService storageService;

    @InjectMocks
    private ComplaintService complaintService;

    private User workerUser;
    private UserPrincipal workerPrincipal;
    private User otherWorkerUser;
    private User citizenUser;
    private UUID workerId;
    private UUID otherWorkerId;

    @BeforeEach
    void setUp() {
        workerId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        otherWorkerId = UUID.fromString("00000000-0000-0000-0000-000000000005");

        Role workerRole = new Role(RoleName.WORKER);

        workerUser = new User();
        workerUser.setId(workerId);
        workerUser.setFullName("Marcus Chen");
        workerUser.setEmail("marcus.chen@fieldops.gov");
        workerUser.setPasswordHash("$2a$10$hashed");
        workerUser.setRoles(Set.of(workerRole));
        workerPrincipal = new UserPrincipal(workerUser);

        otherWorkerUser = new User();
        otherWorkerUser.setId(otherWorkerId);
        otherWorkerUser.setFullName("David Kalu");
        otherWorkerUser.setEmail("david.kalu@waterworks.gov");
        otherWorkerUser.setPasswordHash("$2a$10$hashed");
        otherWorkerUser.setRoles(Set.of(workerRole));

        citizenUser = new User();
        citizenUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        citizenUser.setFullName("Alex Morgan");
        citizenUser.setEmail("alex.m@citizen.org");
    }

    private Complaint createMockComplaint(UUID complaintId, String refId, User assignedWorker) {
        Complaint c = new Complaint();
        c.setId(complaintId);
        c.setReferenceId(refId);
        c.setTitle("Test Road Repair");
        c.setDescription("Pothole near 2nd Avenue");
        c.setCategory("ROADS");
        c.setPriority(ComplaintPriority.HIGH);
        c.setStatus(ComplaintStatus.ASSIGNED);
        c.setAddress("2nd Avenue, Anna Nagar");
        c.setCitizen(citizenUser);
        c.setAssignedWorker(assignedWorker);
        return c;
    }

    @Test
    @DisplayName("Worker queries tasks: returns only complaints assigned to that worker")
    void getComplaints_forWorker_returnsOnlyAssignedTasks() {
        Pageable pageable = PageRequest.of(0, 15);
        Complaint assignedComplaint = createMockComplaint(UUID.randomUUID(), "CF-2026-10001", workerUser);
        Page<Complaint> page = new PageImpl<>(List.of(assignedComplaint), pageable, 1);

        when(complaintRepository.findByAssignedWorkerIdOrderByCreatedAtDesc(workerId, pageable))
                .thenReturn(page);

        PagedResponse<ComplaintResponse> response = complaintService.getComplaints(workerPrincipal, null, null, pageable);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("CF-2026-10001", response.getContent().get(0).getReferenceId());
        verify(complaintRepository).findByAssignedWorkerIdOrderByCreatedAtDesc(workerId, pageable);
        verify(complaintRepository, never()).findAllByOrderByCreatedAtDesc(any());
    }

    @Test
    @DisplayName("Worker queries tasks with status: filters assigned tasks by status")
    void getComplaints_forWorkerWithStatus_returnsFilteredAssignedTasks() {
        Pageable pageable = PageRequest.of(0, 15);
        Complaint assignedComplaint = createMockComplaint(UUID.randomUUID(), "CF-2026-10002", workerUser);
        Page<Complaint> page = new PageImpl<>(List.of(assignedComplaint), pageable, 1);

        when(complaintRepository.findByAssignedWorkerIdAndStatusOrderByCreatedAtDesc(workerId, ComplaintStatus.ASSIGNED, pageable))
                .thenReturn(page);

        PagedResponse<ComplaintResponse> response = complaintService.getComplaints(
                workerPrincipal, ComplaintStatus.ASSIGNED, null, pageable
        );

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        verify(complaintRepository).findByAssignedWorkerIdAndStatusOrderByCreatedAtDesc(workerId, ComplaintStatus.ASSIGNED, pageable);
    }

    @Test
    @DisplayName("Worker retrieves assigned complaint details: succeeds when worker is assigned")
    void getComplaintById_whenWorkerIsAssigned_succeeds() {
        UUID complaintId = UUID.randomUUID();
        Complaint assignedComplaint = createMockComplaint(complaintId, "CF-2026-10003", workerUser);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(assignedComplaint));

        ComplaintResponse response = complaintService.getComplaintById(complaintId.toString(), workerPrincipal);

        assertNotNull(response);
        assertEquals("CF-2026-10003", response.getReferenceId());
        assertEquals("ASSIGNED", response.getStatus());
    }

    @Test
    @DisplayName("Worker retrieves unassigned complaint details: throws ForbiddenException")
    void getComplaintById_whenWorkerIsNotAssigned_throwsForbiddenException() {
        UUID complaintId = UUID.randomUUID();
        // Complaint assigned to otherWorkerUser, not workerUser
        Complaint unassignedComplaint = createMockComplaint(complaintId, "CF-2026-10004", otherWorkerUser);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(unassignedComplaint));

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                complaintService.getComplaintById(complaintId.toString(), workerPrincipal)
        );

        assertTrue(ex.getMessage().contains("Workers may only access repair orders assigned to their crew"));
    }

    @Test
    @DisplayName("Worker retrieves non-existent complaint: throws ResourceNotFoundException")
    void getComplaintById_whenNotFound_throwsResourceNotFoundException() {
        UUID missingId = UUID.randomUUID();
        when(complaintRepository.findById(missingId)).thenReturn(Optional.empty());
        when(complaintRepository.findByReferenceIdIgnoreCase(missingId.toString())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                complaintService.getComplaintById(missingId.toString(), workerPrincipal)
        );
    }

    @Test
    @DisplayName("Blank task ID: throws BadRequestException without database query")
    void getComplaintById_whenBlankId_throwsBadRequestException() {
        assertThrows(BadRequestException.class, () ->
                complaintService.getComplaintById("", workerPrincipal)
        );

        assertThrows(BadRequestException.class, () ->
                complaintService.getComplaintById("   ", workerPrincipal)
        );

        verifyNoInteractions(complaintRepository);
    }

    @Test
    @DisplayName("Worker retrieves assigned complaint history: succeeds when assigned")
    void getComplaintHistory_whenAssigned_returnsHistoryList() {
        UUID complaintId = UUID.randomUUID();
        Complaint assignedComplaint = createMockComplaint(complaintId, "CF-2026-10005", workerUser);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(assignedComplaint));

        ComplaintStatusHistory historyEntry = new ComplaintStatusHistory();
        historyEntry.setId(UUID.randomUUID());
        historyEntry.setComplaint(assignedComplaint);
        historyEntry.setPreviousStatus(null);
        historyEntry.setNewStatus("SUBMITTED");
        historyEntry.setChangedByUser(citizenUser);
        historyEntry.setNotes("Initial filing");

        when(historyRepository.findByComplaintIdOrderByCreatedAtAsc(complaintId))
                .thenReturn(List.of(historyEntry));

        List<ComplaintHistoryResponse> history = complaintService.getComplaintHistory(complaintId.toString(), workerPrincipal);

        assertNotNull(history);
        assertEquals(1, history.size());
        assertEquals("SUBMITTED", history.get(0).getNewStatus());
    }

    @Test
    @DisplayName("Worker retrieves unassigned complaint history: throws ForbiddenException")
    void getComplaintHistory_whenNotAssigned_throwsForbiddenException() {
        UUID complaintId = UUID.randomUUID();
        Complaint unassignedComplaint = createMockComplaint(complaintId, "CF-2026-10006", otherWorkerUser);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(unassignedComplaint));

        assertThrows(ForbiddenException.class, () ->
                complaintService.getComplaintHistory(complaintId.toString(), workerPrincipal)
        );

        verifyNoInteractions(historyRepository);
    }

    // Step 4B Tests: Worker Status Transition to IN_PROGRESS & On-Site Progress Tracking
    @Test
    @DisplayName("Worker transitions assigned task from ASSIGNED to IN_PROGRESS: succeeds")
    void transitionStatus_toInProgress_whenWorkerIsAssigned_succeeds() {
        UUID complaintId = UUID.randomUUID();
        Complaint assignedComplaint = createMockComplaint(complaintId, "CF-2026-20001", workerUser);
        assignedComplaint.setStatus(ComplaintStatus.ASSIGNED);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(assignedComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.IN_PROGRESS);
        req.setNotes("Technician arrived on site with compaction rig.");

        ComplaintResponse response = complaintService.transitionStatus(complaintId.toString(), req, workerPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals("IN_PROGRESS", response.getStatus());
        verify(complaintRepository).save(assignedComplaint);
        verify(auditService).logAction(eq(workerId), eq("Marcus Chen"), anyString(), eq("TRANSITION_STATUS"), eq("COMPLAINT"), eq(complaintId.toString()), anyString(), eq("127.0.0.1"), eq("SUCCESS"));
    }

    @Test
    @DisplayName("Worker transitions assigned task from REWORK_REQUESTED to IN_PROGRESS: succeeds")
    void transitionStatus_toInProgress_whenReworkRequested_succeeds() {
        UUID complaintId = UUID.randomUUID();
        Complaint assignedComplaint = createMockComplaint(complaintId, "CF-2026-20002", workerUser);
        assignedComplaint.setStatus(ComplaintStatus.REWORK_REQUESTED);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(assignedComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.IN_PROGRESS);
        req.setNotes("Technician re-arrived on site for corrective remediation.");

        ComplaintResponse response = complaintService.transitionStatus(complaintId.toString(), req, workerPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals("IN_PROGRESS", response.getStatus());
    }

    @Test
    @DisplayName("Worker transitions task not assigned to them to IN_PROGRESS: throws ForbiddenException")
    void transitionStatus_toInProgress_whenWorkerNotAssigned_throwsForbiddenException() {
        UUID complaintId = UUID.randomUUID();
        Complaint otherComplaint = createMockComplaint(complaintId, "CF-2026-20003", otherWorkerUser);
        otherComplaint.setStatus(ComplaintStatus.ASSIGNED);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(otherComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.IN_PROGRESS);
        req.setNotes("Unauthorized worker attempting to start task");

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), req, workerPrincipal, "127.0.0.1")
        );

        assertTrue(ex.getMessage().contains("Only the assigned field worker or an officer"));
        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Worker transitions task already IN_PROGRESS to IN_PROGRESS: throws BadRequestException (duplicate prevention)")
    void transitionStatus_toInProgress_whenAlreadyInProgress_throwsBadRequestException() {
        UUID complaintId = UUID.randomUUID();
        Complaint activeComplaint = createMockComplaint(complaintId, "CF-2026-20004", workerUser);
        activeComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(activeComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.IN_PROGRESS);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), req, workerPrincipal, "127.0.0.1")
        );

        assertTrue(ex.getMessage().contains("already in status: IN_PROGRESS"));
    }

    @Test
    @DisplayName("Worker transitions task from invalid status (e.g. SUBMITTED or RESOLVED) to IN_PROGRESS: throws BadRequestException")
    void transitionStatus_toInProgress_fromIllegalStatus_throwsBadRequestException() {
        UUID complaintId = UUID.randomUUID();
        Complaint resolvedComplaint = createMockComplaint(complaintId, "CF-2026-20005", workerUser);
        resolvedComplaint.setStatus(ComplaintStatus.RESOLVED);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(resolvedComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.IN_PROGRESS);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), req, workerPrincipal, "127.0.0.1")
        );

        assertTrue(ex.getMessage().contains("Task cannot be transitioned to IN_PROGRESS from status: RESOLVED"));
    }

    @Test
    @DisplayName("Worker adds on-site operational progress note: succeeds and records in history")
    void addProgressNote_whenWorkerAssigned_succeeds() {
        UUID complaintId = UUID.randomUUID();
        Complaint activeComplaint = createMockComplaint(complaintId, "CF-2026-20006", workerUser);
        activeComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(activeComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ComplaintResponse response = complaintService.addProgressNote(
                complaintId.toString(),
                "Sub-base layer compacted with 1.5t roller. Hot-mix scheduled for 14:00.",
                workerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(response);
        verify(complaintRepository).save(activeComplaint);
        verify(auditService).logAction(eq(workerId), eq("Marcus Chen"), anyString(), eq("PROGRESS_NOTE"), eq("COMPLAINT"), eq(complaintId.toString()), anyString(), eq("127.0.0.1"), eq("SUCCESS"));
    }

    @Test
    @DisplayName("Worker adds progress note to unassigned task: throws ForbiddenException")
    void addProgressNote_whenWorkerNotAssigned_throwsForbiddenException() {
        UUID complaintId = UUID.randomUUID();
        Complaint otherComplaint = createMockComplaint(complaintId, "CF-2026-20007", otherWorkerUser);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(otherComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));

        assertThrows(ForbiddenException.class, () ->
                complaintService.addProgressNote(complaintId.toString(), "Note by unauthorized worker", workerPrincipal, "127.0.0.1")
        );

        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Worker adds empty or whitespace progress note: throws BadRequestException")
    void addProgressNote_whenNoteIsEmpty_throwsBadRequestException() {
        assertThrows(BadRequestException.class, () ->
                complaintService.addProgressNote("some-id", "", workerPrincipal, "127.0.0.1")
        );

        assertThrows(BadRequestException.class, () ->
                complaintService.addProgressNote("some-id", "   ", workerPrincipal, "127.0.0.1")
        );

        verifyNoInteractions(complaintRepository);
    }

    // --- Step 4C: Repair Evidence Submission Tests ---

    @Test
    @DisplayName("Step 4C: Assigned worker submits valid repair evidence photos and notes: transitions to RESOLUTION_SUBMITTED")
    void submitEvidence_whenAssignedWorkerWithValidFiles_transitionsToResolutionSubmitted() throws Exception {
        UUID complaintId = UUID.randomUUID();
        Complaint inProgressComplaint = createMockComplaint(complaintId, "CF-2026-30001", workerUser);
        inProgressComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        MockMultipartFile photo1 = new MockMultipartFile("files", "repair_after.jpg", "image/jpeg", "image-bytes-1".getBytes());
        MockMultipartFile photo2 = new MockMultipartFile("files", "compaction_proof.png", "image/png", "image-bytes-2".getBytes());

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(inProgressComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(i -> i.getArgument(0));
        when(storageService.storeFile(eq(photo1), anyString())).thenReturn("/api/complaints/evidence/files/evidence-uuid1.jpg");
        when(storageService.storeFile(eq(photo2), anyString())).thenReturn("/api/complaints/evidence/files/evidence-uuid2.png");

        ComplaintResponse response = complaintService.submitEvidence(
                complaintId.toString(),
                "Asphalt compaction completed flush with curb. Density test verified.",
                List.of(photo1, photo2),
                new BigDecimal("13.0850000"),
                new BigDecimal("80.2100000"),
                new BigDecimal("12.5"),
                true,
                workerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(response);
        assertEquals("RESOLUTION_SUBMITTED", response.getStatus());
        assertEquals(ComplaintStatus.RESOLUTION_SUBMITTED, inProgressComplaint.getStatus());

        // Verify evidence photos saved
        verify(evidenceRepository, times(2)).save(any(ResolutionEvidence.class));
        verify(historyRepository).save(any(ComplaintStatusHistory.class));
        verify(auditService).logAction(eq(workerId), eq("Marcus Chen"), anyString(), eq("SUBMIT_EVIDENCE"), eq("COMPLAINT"), eq("CF-2026-30001"), anyString(), eq("127.0.0.1"), eq("SUCCESS"));
    }

    @Test
    @DisplayName("Step 4C: Worker cannot submit evidence for unassigned task: throws ForbiddenException")
    void submitEvidence_whenUnassigned_throwsForbiddenException() {
        UUID complaintId = UUID.randomUUID();
        Complaint unassignedComplaint = createMockComplaint(complaintId, "CF-2026-30002", null);
        unassignedComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        MockMultipartFile photo = new MockMultipartFile("files", "repair.jpg", "image/jpeg", "bytes".getBytes());
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(unassignedComplaint));

        assertThrows(ForbiddenException.class, () ->
                complaintService.submitEvidence(complaintId.toString(), "Done.", List.of(photo), null, null, null, false, workerPrincipal, "127.0.0.1")
        );

        verify(complaintRepository, never()).save(any());
        verifyNoInteractions(storageService);
    }

    @Test
    @DisplayName("Step 4C: Worker cannot submit evidence for task assigned to another worker: throws ForbiddenException")
    void submitEvidence_whenAssignedToAnotherWorker_throwsForbiddenException() {
        UUID complaintId = UUID.randomUUID();
        Complaint otherWorkerComplaint = createMockComplaint(complaintId, "CF-2026-30003", otherWorkerUser);
        otherWorkerComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        MockMultipartFile photo = new MockMultipartFile("files", "repair.jpg", "image/jpeg", "bytes".getBytes());
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(otherWorkerComplaint));

        assertThrows(ForbiddenException.class, () ->
                complaintService.submitEvidence(complaintId.toString(), "Done.", List.of(photo), null, null, null, false, workerPrincipal, "127.0.0.1")
        );

        verify(complaintRepository, never()).save(any());
        verifyNoInteractions(storageService);
    }

    @Test
    @DisplayName("Step 4C: Evidence submission rejected if task is NOT in IN_PROGRESS status: throws BadRequestException")
    void submitEvidence_whenStatusIsNotInProgress_throwsBadRequestException() {
        UUID complaintId = UUID.randomUUID();
        Complaint assignedComplaint = createMockComplaint(complaintId, "CF-2026-30004", workerUser);
        assignedComplaint.setStatus(ComplaintStatus.ASSIGNED); // not IN_PROGRESS

        MockMultipartFile photo = new MockMultipartFile("files", "repair.jpg", "image/jpeg", "bytes".getBytes());
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(assignedComplaint));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(complaintId.toString(), "Done.", List.of(photo), null, null, null, false, workerPrincipal, "127.0.0.1")
        );

        assertTrue(ex.getMessage().contains("Allowed previous status: IN_PROGRESS"));
        verify(complaintRepository, never()).save(any());
        verifyNoInteractions(storageService);
    }

    @Test
    @DisplayName("Step 4C: Evidence submission rejected when notes are empty: throws BadRequestException")
    void submitEvidence_whenNotesEmpty_throwsBadRequestException() {
        UUID complaintId = UUID.randomUUID();
        Complaint inProgressComplaint = createMockComplaint(complaintId, "CF-2026-30005", workerUser);
        inProgressComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        MockMultipartFile photo = new MockMultipartFile("files", "repair.jpg", "image/jpeg", "bytes".getBytes());
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(inProgressComplaint));

        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(complaintId.toString(), "", List.of(photo), null, null, null, false, workerPrincipal, "127.0.0.1")
        );

        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(complaintId.toString(), "   ", List.of(photo), null, null, null, false, workerPrincipal, "127.0.0.1")
        );

        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Step 4C: Evidence submission rejected when files list is empty: throws BadRequestException")
    void submitEvidence_whenNoFiles_throwsBadRequestException() {
        UUID complaintId = UUID.randomUUID();
        Complaint inProgressComplaint = createMockComplaint(complaintId, "CF-2026-30006", workerUser);
        inProgressComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(inProgressComplaint));

        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(complaintId.toString(), "Good notes.", Collections.emptyList(), null, null, null, false, workerPrincipal, "127.0.0.1")
        );

        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Step 4C: Evidence submission rejected when more than 5 files provided: throws BadRequestException")
    void submitEvidence_whenTooManyFiles_throwsBadRequestException() {
        UUID complaintId = UUID.randomUUID();
        Complaint inProgressComplaint = createMockComplaint(complaintId, "CF-2026-30007", workerUser);
        inProgressComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        List<MultipartFile> sixPhotos = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            sixPhotos.add(new MockMultipartFile("files", "photo" + i + ".jpg", "image/jpeg", "bytes".getBytes()));
        }

        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(inProgressComplaint));

        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(complaintId.toString(), "Good notes.", sixPhotos, null, null, null, false, workerPrincipal, "127.0.0.1")
        );

        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Step 4C: Storage failure rolls back cleanly without false status transition")
    void submitEvidence_whenStorageFails_rollsBackWithoutStatusTransition() throws Exception {
        UUID complaintId = UUID.randomUUID();
        Complaint inProgressComplaint = createMockComplaint(complaintId, "CF-2026-30008", workerUser);
        inProgressComplaint.setStatus(ComplaintStatus.IN_PROGRESS);
        inProgressComplaint.setLatitude(new BigDecimal("13.0850000"));
        inProgressComplaint.setLongitude(new BigDecimal("80.2100000"));

        MockMultipartFile photo = new MockMultipartFile("files", "repair.jpg", "image/jpeg", "bytes".getBytes());
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(inProgressComplaint));
        when(userRepository.findById(workerId)).thenReturn(Optional.of(workerUser));
        when(storageService.storeFile(any(), anyString())).thenThrow(new java.io.IOException("Disk full / I/O error"));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                complaintService.submitEvidence(
                        complaintId.toString(),
                        "Repairs completed.",
                        List.of(photo),
                        new BigDecimal("13.0850000"),
                        new BigDecimal("80.2100000"),
                        new BigDecimal("10.0"),
                        true,
                        workerPrincipal,
                        "127.0.0.1"
                )
        );

        assertTrue(ex.getMessage().contains("Failed to store evidence photos"));
        assertEquals(ComplaintStatus.IN_PROGRESS, inProgressComplaint.getStatus());
        verify(complaintRepository, never()).save(any());
        verify(historyRepository, never()).save(any());
    }
}
