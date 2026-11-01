package com.civicfix.complaint;

import com.civicfix.ai.AiTriageService;
import com.civicfix.ai.dto.DuplicateCandidate;
import com.civicfix.audit.AuditService;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ConflictException;
import com.civicfix.common.exception.ForbiddenException;
import com.civicfix.complaint.dto.AdjudicateTriageRequest;
import com.civicfix.complaint.dto.ComplaintResponse;
import com.civicfix.complaint.dto.LinkDuplicateRequest;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintAdjudicationAndDuplicateTest {

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

    @Mock
    private AiTriageService aiTriageService;

    @InjectMocks
    private ComplaintService complaintService;

    private User officerUser;
    private UserPrincipal officerPrincipal;
    private UserPrincipal citizenPrincipal;
    private UserPrincipal workerPrincipal;
    private Complaint targetComplaint;

    @BeforeEach
    void setUp() {
        Role officerRole = new Role(RoleName.OFFICER);
        officerUser = new User();
        officerUser.setId(UUID.randomUUID());
        officerUser.setFullName("Ramesh Officer");
        officerUser.setEmail("ramesh.officer@chennaicorporation.gov.in");
        officerUser.setPasswordHash("$2a$10$hashed");
        officerUser.setRoles(Set.of(officerRole));
        officerPrincipal = new UserPrincipal(officerUser);

        Role citizenRole = new Role(RoleName.CITIZEN);
        User citizenUser = new User();
        citizenUser.setId(UUID.randomUUID());
        citizenUser.setFullName("Karthik Citizen");
        citizenUser.setEmail("citizen@example.com");
        citizenUser.setPasswordHash("$2a$10$hashed");
        citizenUser.setRoles(Set.of(citizenRole));
        citizenPrincipal = new UserPrincipal(citizenUser);

        Role workerRole = new Role(RoleName.WORKER);
        User workerUser = new User();
        workerUser.setId(UUID.randomUUID());
        workerUser.setFullName("Mani Worker");
        workerUser.setEmail("worker@example.com");
        workerUser.setPasswordHash("$2a$10$hashed");
        workerUser.setRoles(Set.of(workerRole));
        workerPrincipal = new UserPrincipal(workerUser);

        User citizen = citizenUser;

        targetComplaint = new Complaint();
        targetComplaint.setId(UUID.randomUUID());
        targetComplaint.setReferenceId("CF-2026-10001");
        targetComplaint.setTitle("Broken pavement slab");
        targetComplaint.setDescription("Broken pavement slab near bus stop causing pedestrian hazard.");
        targetComplaint.setCategory("ROADS");
        targetComplaint.setPriority(ComplaintPriority.MEDIUM);
        targetComplaint.setStatus(ComplaintStatus.SUBMITTED);
        targetComplaint.setCitizen(citizen);
        targetComplaint.setAddress("Poonamallee High Road, Chennai");
        targetComplaint.setLatitude(BigDecimal.valueOf(13.0827));
        targetComplaint.setLongitude(BigDecimal.valueOf(80.2707));
        targetComplaint.setVersion(0L);
    }

    // =========================================================================
    // 1. Officer AI Triage Adjudication Tests
    // =========================================================================

    @Test
    @DisplayName("ACCEPT Decision: Adopting AI triage category and priority updates official fields")
    void testOfficerCanAcceptAiTriageRecommendation() {
        targetComplaint.setAiDetectedCategory("ROADS_FOOTPATHS");
        targetComplaint.setAiRecommendedPriority(ComplaintPriority.HIGH);
        targetComplaint.setAiAdjudicationStatus("PENDING");

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        AdjudicateTriageRequest request = new AdjudicateTriageRequest("ACCEPT", null, null, "Approved by Ramesh", 0L);
        ComplaintResponse response = complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals("ROADS_FOOTPATHS", targetComplaint.getCategory());
        assertEquals(ComplaintPriority.HIGH, targetComplaint.getPriority());
        assertEquals("ACCEPTED", targetComplaint.getAiAdjudicationStatus());

        verify(auditService).logAction(
                eq(officerUser.getId()),
                eq("Ramesh Officer"),
                eq("ROLE_OFFICER"),
                eq("ADJUDICATE_AI_TRIAGE"),
                eq("COMPLAINT"),
                eq(targetComplaint.getId().toString()),
                contains("accepted AI triage"),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("OVERRIDE Decision: Officer overrides AI recommendation with validated custom category and priority")
    void testOfficerCanOverrideAiTriageRecommendation() {
        targetComplaint.setAiDetectedCategory("ROADS");
        targetComplaint.setAiRecommendedPriority(ComplaintPriority.MEDIUM);
        targetComplaint.setAiAdjudicationStatus("PENDING");

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        AdjudicateTriageRequest request = new AdjudicateTriageRequest("OVERRIDE", "WATER_SEWERAGE", ComplaintPriority.CRITICAL, "Underground water main cracked", 0L);
        ComplaintResponse response = complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals("WATER_SEWERAGE", targetComplaint.getCategory());
        assertEquals(ComplaintPriority.CRITICAL, targetComplaint.getPriority());
        assertEquals("OVERRIDDEN", targetComplaint.getAiAdjudicationStatus());

        verify(auditService).logAction(
                eq(officerUser.getId()),
                eq("Ramesh Officer"),
                eq("ROLE_OFFICER"),
                eq("ADJUDICATE_AI_TRIAGE"),
                eq("COMPLAINT"),
                eq(targetComplaint.getId().toString()),
                contains("overrode AI triage"),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("DISMISS Decision: Preserves existing official fields and marks status DISMISSED")
    void testOfficerCanDismissAiTriageRecommendation() {
        targetComplaint.setCategory("GARBAGE");
        targetComplaint.setPriority(ComplaintPriority.LOW);
        targetComplaint.setAiDetectedCategory("ROADS");
        targetComplaint.setAiRecommendedPriority(ComplaintPriority.HIGH);
        targetComplaint.setAiAdjudicationStatus("PENDING");

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        AdjudicateTriageRequest request = new AdjudicateTriageRequest("DISMISS", null, null, "AI misidentified garbage heap", 0L);
        ComplaintResponse response = complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1");

        assertNotNull(response);
        // Official fields must NOT change
        assertEquals("GARBAGE", targetComplaint.getCategory());
        assertEquals(ComplaintPriority.LOW, targetComplaint.getPriority());
        assertEquals("DISMISSED", targetComplaint.getAiAdjudicationStatus());

        verify(auditService).logAction(
                eq(officerUser.getId()),
                eq("Ramesh Officer"),
                eq("ROLE_OFFICER"),
                eq("ADJUDICATE_AI_TRIAGE"),
                eq("COMPLAINT"),
                eq(targetComplaint.getId().toString()),
                contains("dismissed AI triage"),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("Security: Citizen cannot adjudicate AI triage recommendations")
    void testCitizenCannotAdjudicateTriage() {
        AdjudicateTriageRequest request = new AdjudicateTriageRequest("ACCEPT", null, null, "Hacker attempt", 0L);

        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, citizenPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Only municipal officers and administrators"));
        verifyNoInteractions(complaintRepository);
    }

    @Test
    @DisplayName("Optimistic Locking: Stale version during adjudication throws ConflictException")
    void testAdjudicateWithStaleVersionThrowsConflict() {
        targetComplaint.setVersion(2L);
        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        AdjudicateTriageRequest request = new AdjudicateTriageRequest("ACCEPT", null, null, "Outdated update", 1L);

        ConflictException ex = assertThrows(ConflictException.class, () ->
                complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("modified by another transaction"));
        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Validation: ACCEPT fails gracefully when no AI recommendations are present")
    void testAcceptFailsWhenNoRecommendationPresent() {
        targetComplaint.setAiDetectedCategory(null);
        targetComplaint.setAiRecommendedPriority(null);

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        AdjudicateTriageRequest request = new AdjudicateTriageRequest("ACCEPT", null, null, "Try accept empty", 0L);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("No pending AI recommendation available"));
    }

    @Test
    @DisplayName("Validation: OVERRIDE fails when neither category nor priority is provided")
    void testOverrideFailsWhenNeitherCategoryNorPriorityProvided() {
        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        AdjudicateTriageRequest request = new AdjudicateTriageRequest("OVERRIDE", null, null, "Empty override", 0L);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Override action requires either an updated category or priority"));
    }

    @Test
    @DisplayName("Validation: Unknown adjudication action throws BadRequestException")
    void testInvalidAdjudicationActionThrowsBadRequest() {
        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        AdjudicateTriageRequest request = new AdjudicateTriageRequest("INVALID_ACTION", null, null, "Testing invalid", 0L);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.adjudicateTriage(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Invalid adjudication action"));
    }

    // =========================================================================
    // 2. Duplicate Candidate Retrieval Tests
    // =========================================================================

    @Test
    @DisplayName("Security: Worker or Citizen cannot retrieve duplicate candidates")
    void testUnauthorizedUserCannotRetrieveDuplicateCandidates() {
        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                complaintService.getDuplicateCandidates(targetComplaint.getId().toString(), citizenPrincipal)
        );
        assertTrue(ex.getMessage().contains("Only municipal officers and administrators"));

        assertThrows(ForbiddenException.class, () ->
                complaintService.getDuplicateCandidates(targetComplaint.getId().toString(), workerPrincipal)
        );
    }

    @Test
    @DisplayName("Data Minimization: Duplicate candidates return ranked items with explanations without private citizen info")
    void testOfficerRetrievesDuplicateCandidatesWithExplanation() {
        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));

        DuplicateCandidate candidate = new DuplicateCandidate(
                UUID.randomUUID(),
                "CF-2026-00005",
                "Deep pothole on main road",
                "ROADS",
                "SUBMITTED",
                25.4,
                0.85,
                OffsetDateTime.now().minusHours(2),
                "Proximity: 25.4m away, 85% text match in ROADS"
        );

        when(aiTriageService.findDuplicateCandidates(targetComplaint)).thenReturn(List.of(candidate));

        List<DuplicateCandidate> results = complaintService.getDuplicateCandidates(targetComplaint.getId().toString(), officerPrincipal);

        assertNotNull(results);
        assertEquals(1, results.size());
        DuplicateCandidate item = results.get(0);
        assertEquals("CF-2026-00005", item.getReferenceId());
        assertEquals("ROADS", item.getCategory());
        assertEquals(25.4, item.getDistanceMeters());
        assertEquals(0.85, item.getSimilarityScore());
        assertEquals("Proximity: 25.4m away, 85% text match in ROADS", item.getExplanation());
    }

    // =========================================================================
    // 3. Non-Destructive Duplicate Linking Tests
    // =========================================================================

    @Test
    @DisplayName("Duplicate Linking: Non-destructive linking associates child to parent master complaint")
    void testOfficerCanLinkDuplicateComplaint() {
        Complaint parentComplaint = new Complaint();
        parentComplaint.setId(UUID.randomUUID());
        parentComplaint.setReferenceId("CF-2026-00001");
        parentComplaint.setTitle("Pothole on 1st avenue");
        parentComplaint.setCategory("ROADS");
        parentComplaint.setStatus(ComplaintStatus.IN_PROGRESS);

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(complaintRepository.findById(parentComplaint.getId())).thenReturn(Optional.of(parentComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));
        when(complaintRepository.countByDuplicateOfId(targetComplaint.getId())).thenReturn(0L);
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        LinkDuplicateRequest request = new LinkDuplicateRequest(parentComplaint.getId().toString(), "Identical pothole report", 0L);
        ComplaintResponse response = complaintService.linkDuplicate(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1");

        assertNotNull(response);
        assertEquals(parentComplaint, targetComplaint.getDuplicateOf());
        // Confirm citizen ownership, title, and status were preserved
        assertEquals("Karthik Citizen", targetComplaint.getCitizen().getFullName());
        assertEquals("Broken pavement slab", targetComplaint.getTitle());
        assertEquals(ComplaintStatus.SUBMITTED, targetComplaint.getStatus());

        verify(auditService).logAction(
                eq(officerUser.getId()),
                eq("Ramesh Officer"),
                eq("ROLE_OFFICER"),
                eq("LINK_DUPLICATE"),
                eq("COMPLAINT"),
                eq(targetComplaint.getId().toString()),
                contains("linked complaint #CF-2026-10001 as duplicate of #CF-2026-00001"),
                eq("127.0.0.1"),
                eq("SUCCESS")
        );
    }

    @Test
    @DisplayName("Safeguard: Prevent self-linking a complaint as duplicate of itself")
    void testPreventSelfLinking() {
        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        LinkDuplicateRequest request = new LinkDuplicateRequest(targetComplaint.getId().toString(), "Self link attempt", 0L);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.linkDuplicate(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("cannot be linked as a duplicate of itself"));
        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Safeguard: Prevent duplicate chains when parent is already a duplicate")
    void testPreventDuplicateChainingWhenParentIsAlreadyDuplicate() {
        Complaint rootComplaint = new Complaint();
        rootComplaint.setId(UUID.randomUUID());
        rootComplaint.setReferenceId("CF-2026-ROOT");

        Complaint parentComplaint = new Complaint();
        parentComplaint.setId(UUID.randomUUID());
        parentComplaint.setReferenceId("CF-2026-CHILD1");
        parentComplaint.setDuplicateOf(rootComplaint); // Parent is already a duplicate!

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(complaintRepository.findById(parentComplaint.getId())).thenReturn(Optional.of(parentComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        LinkDuplicateRequest request = new LinkDuplicateRequest(parentComplaint.getId().toString(), "Chain attempt", 0L);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.linkDuplicate(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Invalid duplicate chain"));
        assertTrue(ex.getMessage().contains("link directly to root complaint #CF-2026-ROOT"));
        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Safeguard: Prevent duplicate chains when child complaint already has duplicates linked to it")
    void testPreventDuplicateChainingWhenChildAlreadyHasDuplicates() {
        Complaint parentComplaint = new Complaint();
        parentComplaint.setId(UUID.randomUUID());
        parentComplaint.setReferenceId("CF-2026-PARENT");

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(complaintRepository.findById(parentComplaint.getId())).thenReturn(Optional.of(parentComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));
        when(complaintRepository.countByDuplicateOfId(targetComplaint.getId())).thenReturn(3L);

        LinkDuplicateRequest request = new LinkDuplicateRequest(parentComplaint.getId().toString(), "Make child duplicate", 0L);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.linkDuplicate(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("already has 3 duplicate complaints linked to it"));
        verify(complaintRepository, never()).save(any());
    }

    @Test
    @DisplayName("Safeguard: Detect and prevent circular duplicate links")
    void testPreventCircularDuplicateLinks() {
        Complaint parentComplaint = new Complaint();
        parentComplaint.setId(UUID.randomUUID());
        parentComplaint.setReferenceId("CF-2026-CYCLE");
        // Simulate targetComplaint as ancestor of parentComplaint
        parentComplaint.setDuplicateOf(targetComplaint);

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(complaintRepository.findById(parentComplaint.getId())).thenReturn(Optional.of(parentComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        LinkDuplicateRequest request = new LinkDuplicateRequest(parentComplaint.getId().toString(), "Cycle test", 0L);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                complaintService.linkDuplicate(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("Invalid duplicate chain") || ex.getMessage().contains("Circular duplicate"));
    }

    @Test
    @DisplayName("Optimistic Locking: Stale version during duplicate linking throws ConflictException")
    void testLinkDuplicateOptimisticLockConflict() {
        targetComplaint.setVersion(5L);

        Complaint parentComplaint = new Complaint();
        parentComplaint.setId(UUID.randomUUID());
        parentComplaint.setReferenceId("CF-2026-00001");

        when(complaintRepository.findById(targetComplaint.getId())).thenReturn(Optional.of(targetComplaint));
        when(complaintRepository.findById(parentComplaint.getId())).thenReturn(Optional.of(parentComplaint));
        when(userRepository.findById(officerPrincipal.getId())).thenReturn(Optional.of(officerUser));

        LinkDuplicateRequest request = new LinkDuplicateRequest(parentComplaint.getId().toString(), "Concurrent attempt", 4L);

        ConflictException ex = assertThrows(ConflictException.class, () ->
                complaintService.linkDuplicate(targetComplaint.getId().toString(), request, officerPrincipal, "127.0.0.1")
        );
        assertTrue(ex.getMessage().contains("modified by another transaction"));
        verify(complaintRepository, never()).save(any());
    }
}
