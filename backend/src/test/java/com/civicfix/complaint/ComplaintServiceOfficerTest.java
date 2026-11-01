package com.civicfix.complaint;

import com.civicfix.audit.AuditService;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.complaint.dto.ComplaintResponse;
import com.civicfix.complaint.dto.UpdateStatusRequest;
import com.civicfix.security.UserPrincipal;
import com.civicfix.storage.StorageService;
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
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintServiceOfficerTest {

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
    private StorageService storageService;

    @InjectMocks
    private ComplaintService complaintService;

    private User officerUser;
    private UserPrincipal officerPrincipal;
    private User adminUser;
    private UserPrincipal adminPrincipal;
    private User workerUser;
    private UserPrincipal workerPrincipal;
    private User citizenUser;
    private UserPrincipal citizenPrincipal;

    private UUID complaintId;
    private Complaint complaint;

    @BeforeEach
    void setUp() {
        Role officerRole = new Role(RoleName.OFFICER);
        officerUser = new User();
        officerUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000002"));
        officerUser.setFullName("Elena Vance");
        officerUser.setEmail("elena.vance@metro.gov");
        officerUser.setPasswordHash("$2a$10$hashed");
        officerUser.setRoles(Set.of(officerRole));
        officerPrincipal = new UserPrincipal(officerUser);

        Role adminRole = new Role(RoleName.ADMIN);
        adminUser = new User();
        adminUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000099"));
        adminUser.setFullName("Admin User");
        adminUser.setEmail("admin@metro.gov");
        adminUser.setPasswordHash("$2a$10$hashed");
        adminUser.setRoles(Set.of(adminRole));
        adminPrincipal = new UserPrincipal(adminUser);

        Role workerRole = new Role(RoleName.WORKER);
        workerUser = new User();
        workerUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000003"));
        workerUser.setFullName("Marcus Chen");
        workerUser.setEmail("marcus.chen@fieldops.gov");
        workerUser.setPasswordHash("$2a$10$hashed");
        workerUser.setRoles(Set.of(workerRole));
        workerPrincipal = new UserPrincipal(workerUser);

        Role citizenRole = new Role(RoleName.CITIZEN);
        citizenUser = new User();
        citizenUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        citizenUser.setFullName("Alex Morgan");
        citizenUser.setEmail("alex.m@citizen.org");
        citizenUser.setPasswordHash("$2a$10$hashed");
        citizenUser.setRoles(Set.of(citizenRole));
        citizenPrincipal = new UserPrincipal(citizenUser);

        complaintId = UUID.randomUUID();
        complaint = new Complaint();
        complaint.setId(complaintId);
        complaint.setReferenceId("CF-2026-99001");
        complaint.setTitle("Deep Pothole at 5th Cross");
        complaint.setDescription("Pothole posing hazard to two-wheelers.");
        complaint.setCategory("ROADS");
        complaint.setPriority(ComplaintPriority.HIGH);
        complaint.setStatus(ComplaintStatus.RESOLUTION_SUBMITTED);
        complaint.setCitizen(citizenUser);
        complaint.setAssignedOfficer(officerUser);
        complaint.setAssignedWorker(workerUser);
        complaint.setAddress("5th Cross Road, Anna Nagar");
    }

    @Test
    @DisplayName("Step 4D: Authorized officer can approve resolution evidence from RESOLUTION_SUBMITTED to PENDING_CITIZEN_CONFIRMATION")
    void officerCanApproveResolutionFromSubmittedState() {
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        req.setNotes("Visual inspection passed. Asphalt compaction conforms to city code.");

        ComplaintResponse response = complaintService.transitionStatus(complaintId.toString(), req, officerPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals("PENDING_CITIZEN_CONFIRMATION", response.getStatus());
        assertEquals(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION, complaint.getStatus());

        verify(auditService).logAction(
                eq(officerUser.getId()),
                eq("Elena Vance"),
                eq("ROLE_OFFICER"),
                eq("APPROVE_RESOLUTION"),
                eq("COMPLAINT"),
                eq(complaintId.toString()),
                contains("Transitioned status from RESOLUTION_SUBMITTED to PENDING_CITIZEN_CONFIRMATION"),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("Step 4D: Authorized officer can return work for rework with mandatory reason")
    void officerCanRequestReworkWithReason() {
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.REWORK_REQUESTED);
        req.setNotes("Surface grading is concave; water pooling persists near gutter line.");

        ComplaintResponse response = complaintService.transitionStatus(complaintId.toString(), req, officerPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals("REWORK_REQUESTED", response.getStatus());
        assertEquals(ComplaintStatus.REWORK_REQUESTED, complaint.getStatus());

        verify(auditService).logAction(
                eq(officerUser.getId()),
                eq("Elena Vance"),
                eq("ROLE_OFFICER"),
                eq("REQUEST_REWORK"),
                eq("COMPLAINT"),
                eq(complaintId.toString()),
                contains("Transitioned status from RESOLUTION_SUBMITTED to REWORK_REQUESTED"),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("Step 4D: Officer requesting rework with empty or blank reason is rejected with 400 Bad Request")
    void officerReworkRequestRequiresNonEmptyReason() {
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));

        UpdateStatusRequest reqEmpty = new UpdateStatusRequest();
        reqEmpty.setStatus(ComplaintStatus.REWORK_REQUESTED);
        reqEmpty.setNotes("   ");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), reqEmpty, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("meaningful reason is required"));
    }

    @Test
    @DisplayName("Step 4D: Officer cannot approve (to PENDING_CITIZEN_CONFIRMATION) from states other than RESOLUTION_SUBMITTED")
    void officerCannotApproveWhenNotInResolutionSubmitted() {
        complaint.setStatus(ComplaintStatus.IN_PROGRESS);
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        req.setNotes("Premature sign-off attempt");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), req, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Allowed previous status: RESOLUTION_SUBMITTED"));
    }

    @Test
    @DisplayName("A2 Rule: Officer cannot transition directly to RESOLVED; citizen confirmation is required")
    void officerCannotTransitionDirectlyToResolved() {
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.RESOLVED);
        req.setNotes("Direct resolution attempt");

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), req, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Citizen confirmation or auto-confirmation is required"));
    }

    @Test
    @DisplayName("Step 4D: Officer cannot request rework from states other than RESOLUTION_SUBMITTED")
    void officerCannotRequestReworkWhenNotInResolutionSubmitted() {
        complaint.setStatus(ComplaintStatus.ASSIGNED);
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.REWORK_REQUESTED);
        req.setNotes("Premature rework request");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), req, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Allowed previous status: RESOLUTION_SUBMITTED"));
    }

    @Test
    @DisplayName("Step 4D: Field worker cannot make officer decisions (RESOLVED or REWORK_REQUESTED)")
    void workerCannotMakeOfficerDecisions() {
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(workerUser.getId())).thenReturn(Optional.of(workerUser));

        UpdateStatusRequest resolveReq = new UpdateStatusRequest();
        resolveReq.setStatus(ComplaintStatus.RESOLVED);
        resolveReq.setNotes("Worker attempting self-approval");

        assertThrows(ForbiddenException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), resolveReq, workerPrincipal, "127.0.0.1")
        );

        UpdateStatusRequest reworkReq = new UpdateStatusRequest();
        reworkReq.setStatus(ComplaintStatus.REWORK_REQUESTED);
        reworkReq.setNotes("Worker attempting rework transition");

        assertThrows(ForbiddenException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), reworkReq, workerPrincipal, "127.0.0.1")
        );
    }

    @Test
    @DisplayName("Step 4D: Citizen cannot make officer decisions (RESOLVED or REWORK_REQUESTED)")
    void citizenCannotMakeOfficerDecisions() {
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(citizenUser.getId())).thenReturn(Optional.of(citizenUser));

        UpdateStatusRequest resolveReq = new UpdateStatusRequest();
        resolveReq.setStatus(ComplaintStatus.RESOLVED);
        resolveReq.setNotes("Citizen attempting self-resolution");

        assertThrows(ForbiddenException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), resolveReq, citizenPrincipal, "127.0.0.1")
        );
    }

    @Test
    @DisplayName("Step 4D: Duplicate decision transitioning to same current status is rejected")
    void duplicateStatusTransitionRejected() {
        complaint.setStatus(ComplaintStatus.RESOLVED);
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(officerUser.getId())).thenReturn(Optional.of(officerUser));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.RESOLVED);
        req.setNotes("Duplicate sign-off");

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintId.toString(), req, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("already in status: RESOLVED"));
    }

    @Test
    @DisplayName("Step 4D: Admin can also approve resolution or request rework")
    void adminCanAdjudicateResolution() {
        when(complaintRepository.findById(complaintId)).thenReturn(Optional.of(complaint));
        when(userRepository.findById(adminUser.getId())).thenReturn(Optional.of(adminUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateStatusRequest req = new UpdateStatusRequest();
        req.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        req.setNotes("Administrative executive sign-off");

        ComplaintResponse response = complaintService.transitionStatus(complaintId.toString(), req, adminPrincipal, "127.0.0.1");
        assertEquals("PENDING_CITIZEN_CONFIRMATION", response.getStatus());
    }

    @Test
    @DisplayName("Step 2.1: Evidence file retrieval rejects unauthenticated requests")
    void loadEvidenceFileRequiresAuthentication() {
        assertThrows(ForbiddenException.class, () ->
                complaintService.loadEvidenceFile("evidence-123.jpg", null)
        );
    }

    @Test
    @DisplayName("Step 2.1: Evidence file retrieval rejects null or blank filename")
    void loadEvidenceFileRejectsNullOrBlankFilename() {
        assertThrows(BadRequestException.class, () ->
                complaintService.loadEvidenceFile(null, officerPrincipal)
        );
        assertThrows(BadRequestException.class, () ->
                complaintService.loadEvidenceFile("   ", officerPrincipal)
        );
    }

    @Test
    @DisplayName("Step 2.1: Evidence file retrieval rejects path traversal sequences")
    void loadEvidenceFileRejectsPathTraversal() {
        assertThrows(BadRequestException.class, () ->
                complaintService.loadEvidenceFile("../secret.jpg", officerPrincipal)
        );
        assertThrows(BadRequestException.class, () ->
                complaintService.loadEvidenceFile("sub/secret.jpg", officerPrincipal)
        );
        assertThrows(BadRequestException.class, () ->
                complaintService.loadEvidenceFile("sub\\secret.jpg", officerPrincipal)
        );
    }

    @Test
    @DisplayName("Step 2.1: Evidence file retrieval rejects file on disk not linked to evidence record")
    void loadEvidenceFileRejectsUnlinkedEvidence() throws Exception {
        when(evidenceRepository.findFirstByPhotoUrlContaining("unlinked-file.jpg")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                complaintService.loadEvidenceFile("unlinked-file.jpg", officerPrincipal)
        );
        verify(storageService, never()).loadFileAsResource(any(), any());
    }

    @Test
    @DisplayName("Step 2.1: Evidence file retrieval enforces privacy for non-owner citizens")
    void loadEvidenceFileEnforcesCitizenPrivacy() throws Exception {
        ResolutionEvidence ev = new ResolutionEvidence();
        ev.setComplaint(complaint);
        ev.setPhotoUrl("/api/complaints/evidence/files/evidence-123.jpg");

        when(evidenceRepository.findFirstByPhotoUrlContaining("evidence-123.jpg")).thenReturn(Optional.of(ev));

        // Create a different citizen who does not own this complaint
        User otherCitizen = new User();
        otherCitizen.setId(UUID.fromString("00000000-0000-0000-0000-000000000005"));
        otherCitizen.setEmail("other@resident.org");
        otherCitizen.setPasswordHash("$2a$10$hashed");
        otherCitizen.setRoles(Set.of(new Role(RoleName.CITIZEN)));
        UserPrincipal otherPrincipal = new UserPrincipal(otherCitizen);

        assertThrows(ForbiddenException.class, () ->
                complaintService.loadEvidenceFile("evidence-123.jpg", otherPrincipal)
        );
        verify(storageService, never()).loadFileAsResource(any(), any());
    }

    @Test
    @DisplayName("Step 2.1: Complaint owner citizen can retrieve linked evidence")
    void loadEvidenceFileAllowsComplaintOwnerCitizen() throws IOException {
        ResolutionEvidence ev = new ResolutionEvidence();
        ev.setComplaint(complaint);
        ev.setPhotoUrl("/api/complaints/evidence/files/evidence-123.jpg");

        when(evidenceRepository.findFirstByPhotoUrlContaining("evidence-123.jpg")).thenReturn(Optional.of(ev));
        ByteArrayResource fakeResource = new ByteArrayResource("image-bytes".getBytes());
        when(storageService.loadFileAsResource("evidence-123.jpg", "complaints/" + complaintId)).thenReturn(fakeResource);

        Resource loaded = complaintService.loadEvidenceFile("evidence-123.jpg", citizenPrincipal);
        assertNotNull(loaded);
        assertTrue(loaded.exists());
    }

    @Test
    @DisplayName("Step 2.1: Unassigned worker cannot access evidence for another worker's task")
    void loadEvidenceFileRejectsUnassignedWorker() throws Exception {
        ResolutionEvidence ev = new ResolutionEvidence();
        ev.setComplaint(complaint);
        ev.setPhotoUrl("/api/complaints/evidence/files/evidence-123.jpg");

        when(evidenceRepository.findFirstByPhotoUrlContaining("evidence-123.jpg")).thenReturn(Optional.of(ev));

        // Create another worker who is not assigned to this complaint
        User otherWorker = new User();
        otherWorker.setId(UUID.fromString("00000000-0000-0000-0000-000000000008"));
        otherWorker.setEmail("other.worker@fieldops.gov");
        otherWorker.setPasswordHash("$2a$10$hashed");
        otherWorker.setRoles(Set.of(new Role(RoleName.WORKER)));
        UserPrincipal otherWorkerPrincipal = new UserPrincipal(otherWorker);

        assertThrows(ForbiddenException.class, () ->
                complaintService.loadEvidenceFile("evidence-123.jpg", otherWorkerPrincipal)
        );
        verify(storageService, never()).loadFileAsResource(any(), any());
    }

    @Test
    @DisplayName("Step 2.1: Assigned worker can retrieve linked evidence")
    void loadEvidenceFileAllowsAssignedWorker() throws IOException {
        ResolutionEvidence ev = new ResolutionEvidence();
        ev.setComplaint(complaint);
        ev.setPhotoUrl("/api/complaints/evidence/files/evidence-123.jpg");

        when(evidenceRepository.findFirstByPhotoUrlContaining("evidence-123.jpg")).thenReturn(Optional.of(ev));
        ByteArrayResource fakeResource = new ByteArrayResource("image-bytes".getBytes());
        when(storageService.loadFileAsResource("evidence-123.jpg", "complaints/" + complaintId)).thenReturn(fakeResource);

        Resource loaded = complaintService.loadEvidenceFile("evidence-123.jpg", workerPrincipal);
        assertNotNull(loaded);
        assertTrue(loaded.exists());
    }

    @Test
    @DisplayName("Step 2.1: Officer can retrieve evidence resolved from complaints/{complaintId} subdirectory")
    void officerCanLoadEvidenceFileFromComplaintSubdirectory() throws IOException {
        ResolutionEvidence ev = new ResolutionEvidence();
        ev.setComplaint(complaint);
        ev.setPhotoUrl("/api/complaints/evidence/files/evidence-123.jpg");

        when(evidenceRepository.findFirstByPhotoUrlContaining("evidence-123.jpg")).thenReturn(Optional.of(ev));
        ByteArrayResource fakeResource = new ByteArrayResource("image-bytes".getBytes());
        when(storageService.loadFileAsResource("evidence-123.jpg", "complaints/" + complaintId)).thenReturn(fakeResource);

        Resource loaded = complaintService.loadEvidenceFile("evidence-123.jpg", officerPrincipal);
        assertNotNull(loaded);
        assertTrue(loaded.exists());
        verify(storageService).loadFileAsResource("evidence-123.jpg", "complaints/" + complaintId);
    }

    @Test
    @DisplayName("Step 2.1: Administrator can retrieve evidence resolved from complaints/{complaintId} subdirectory")
    void adminCanLoadEvidenceFileFromComplaintSubdirectory() throws IOException {
        ResolutionEvidence ev = new ResolutionEvidence();
        ev.setComplaint(complaint);
        ev.setPhotoUrl("/api/complaints/evidence/files/evidence-123.jpg");

        when(evidenceRepository.findFirstByPhotoUrlContaining("evidence-123.jpg")).thenReturn(Optional.of(ev));
        ByteArrayResource fakeResource = new ByteArrayResource("image-bytes".getBytes());
        when(storageService.loadFileAsResource("evidence-123.jpg", "complaints/" + complaintId)).thenReturn(fakeResource);

        Resource loaded = complaintService.loadEvidenceFile("evidence-123.jpg", adminPrincipal);
        assertNotNull(loaded);
        assertTrue(loaded.exists());
        verify(storageService).loadFileAsResource("evidence-123.jpg", "complaints/" + complaintId);
    }

    @Test
    @DisplayName("Step 2.1: Missing physical file on disk throws ResourceNotFoundException without leaking paths")
    void loadEvidenceFileThrowsResourceNotFoundWhenStorageThrowsIOException() throws IOException {
        ResolutionEvidence ev = new ResolutionEvidence();
        ev.setComplaint(complaint);
        ev.setPhotoUrl("/api/complaints/evidence/files/missing-file.jpg");

        when(evidenceRepository.findFirstByPhotoUrlContaining("missing-file.jpg")).thenReturn(Optional.of(ev));
        when(storageService.loadFileAsResource("missing-file.jpg", "complaints/" + complaintId))
                .thenThrow(new IOException("File not found on disk"));

        assertThrows(ResourceNotFoundException.class, () ->
                complaintService.loadEvidenceFile("missing-file.jpg", officerPrincipal)
        );
    }
}

