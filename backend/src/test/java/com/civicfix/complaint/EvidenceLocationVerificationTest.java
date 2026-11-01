package com.civicfix.complaint;

import com.civicfix.audit.AuditService;
import com.civicfix.common.exception.BadRequestException;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

public class EvidenceLocationVerificationTest {

    private ComplaintRepository complaintRepository;
    private ComplaintStatusHistoryRepository historyRepository;
    private ResolutionEvidenceRepository evidenceRepository;
    private ComplaintPhotoRepository photoRepository;
    private UserRepository userRepository;
    private AuditService auditService;
    private StorageService storageService;
    private ComplaintService complaintService;

    private User workerUser;
    private User officerUser;
    private UserPrincipal workerPrincipal;
    private UserPrincipal officerPrincipal;

    private Complaint complaintWithCoords;
    private Complaint complaintWithoutCoords;

    private final List<ResolutionEvidence> savedEvidenceList = new ArrayList<>();
    private final AtomicBoolean auditLogged = new AtomicBoolean(false);
    private final List<String> auditDetailsList = new ArrayList<>();

    // Reference center: 12.9716, 77.5946 (Bangalore)
    // 0.00018 deg lat is ~20 meters
    // 0.0045 deg lat is ~500 meters
    private static final BigDecimal BASE_LAT = new BigDecimal("12.971600");
    private static final BigDecimal BASE_LON = new BigDecimal("77.594600");
    private static final BigDecimal NEAR_LAT = new BigDecimal("12.971780"); // ~20m
    private static final BigDecimal FAR_LAT = new BigDecimal("12.976100");  // ~500m

    @BeforeEach
    void setUp() {
        savedEvidenceList.clear();
        auditLogged.set(false);
        auditDetailsList.clear();

        workerUser = new User();
        workerUser.setId(UUID.randomUUID());
        workerUser.setFullName("Marcus Worker");
        workerUser.setEmail("marcus@civicfix.local");
        workerUser.setRoles(Set.of(new Role(RoleName.WORKER)));
        workerPrincipal = new UserPrincipal(workerUser);

        officerUser = new User();
        officerUser.setId(UUID.randomUUID());
        officerUser.setFullName("Officer Dave");
        officerUser.setEmail("officer.dave@civicfix.local");
        officerUser.setRoles(Set.of(new Role(RoleName.OFFICER)));
        officerPrincipal = new UserPrincipal(officerUser);

        complaintWithCoords = new Complaint();
        complaintWithCoords.setId(UUID.randomUUID());
        complaintWithCoords.setReferenceId("CF-2026-LOC01");
        complaintWithCoords.setTitle("Pothole on Main Road");
        complaintWithCoords.setCategory("Roads & Potholes");
        complaintWithCoords.setStatus(ComplaintStatus.IN_PROGRESS);
        complaintWithCoords.setLatitude(BASE_LAT);
        complaintWithCoords.setLongitude(BASE_LON);
        complaintWithCoords.setAssignedWorker(workerUser);
        complaintWithCoords.setAssignedOfficer(officerUser);
        complaintWithCoords.setVersion(1L);

        complaintWithoutCoords = new Complaint();
        complaintWithoutCoords.setId(UUID.randomUUID());
        complaintWithoutCoords.setReferenceId("CF-2026-LOC02");
        complaintWithoutCoords.setTitle("General street complaint");
        complaintWithoutCoords.setCategory("Sanitation");
        complaintWithoutCoords.setStatus(ComplaintStatus.IN_PROGRESS);
        complaintWithoutCoords.setLatitude(null);
        complaintWithoutCoords.setLongitude(null);
        complaintWithoutCoords.setAssignedWorker(workerUser);
        complaintWithoutCoords.setAssignedOfficer(officerUser);
        complaintWithoutCoords.setVersion(1L);

        complaintRepository = (ComplaintRepository) Proxy.newProxyInstance(
                ComplaintRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name) || "findByReferenceId".equals(name) || "findByReferenceIdIgnoreCase".equals(name)) {
                        Object key = args[0];
                        if (complaintWithCoords.getId().equals(key) || complaintWithCoords.getReferenceId().equalsIgnoreCase(String.valueOf(key))) {
                            return Optional.of(complaintWithCoords);
                        }
                        if (complaintWithoutCoords.getId().equals(key) || complaintWithoutCoords.getReferenceId().equalsIgnoreCase(String.valueOf(key))) {
                            return Optional.of(complaintWithoutCoords);
                        }
                        return Optional.empty();
                    }
                    if ("save".equals(name) || "saveAndFlush".equals(name)) {
                        return args[0];
                    }
                    if ("flush".equals(name)) {
                        return null;
                    }
                    return null;
                }
        );

        historyRepository = (ComplaintStatusHistoryRepository) Proxy.newProxyInstance(
                ComplaintStatusHistoryRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintStatusHistoryRepository.class},
                (proxy, method, args) -> args != null && args.length > 0 ? args[0] : null
        );

        evidenceRepository = (ResolutionEvidenceRepository) Proxy.newProxyInstance(
                ResolutionEvidenceRepository.class.getClassLoader(),
                new Class<?>[]{ResolutionEvidenceRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("save".equals(name)) {
                        ResolutionEvidence ev = (ResolutionEvidence) args[0];
                        savedEvidenceList.add(ev);
                        return ev;
                    }
                    if ("findByComplaintIdOrderByCreatedAtDesc".equals(name)) {
                        UUID compId = (UUID) args[0];
                        List<ResolutionEvidence> list = new ArrayList<>();
                        for (ResolutionEvidence e : savedEvidenceList) {
                            if (e.getComplaint() != null && compId.equals(e.getComplaint().getId())) {
                                list.add(e);
                            }
                        }
                        list.sort((a, b) -> {
                            if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                            int cmp = b.getCreatedAt().compareTo(a.getCreatedAt());
                            if (cmp != 0) return cmp;
                            return Integer.compare(savedEvidenceList.indexOf(b), savedEvidenceList.indexOf(a));
                        });
                        return list;
                    }
                    return null;
                }
        );

        photoRepository = (ComplaintPhotoRepository) Proxy.newProxyInstance(
                ComplaintPhotoRepository.class.getClassLoader(),
                new Class<?>[]{ComplaintPhotoRepository.class},
                (proxy, method, args) -> Collections.emptyList()
        );

        userRepository = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName())) {
                        UUID id = (UUID) args[0];
                        if (workerUser.getId().equals(id)) return Optional.of(workerUser);
                        if (officerUser.getId().equals(id)) return Optional.of(officerUser);
                    }
                    return Optional.empty();
                }
        );

        auditService = new AuditService(null) {
            @Override
            public void logAction(UUID userId, String userName, String userRole, String action, String entityType, String entityId, String details, String ipAddress, String status) {
                auditLogged.set(true);
                auditDetailsList.add(action + ": " + details);
            }
        };

        storageService = new StorageService() {
            @Override
            public String storeFile(MultipartFile file, String subDirectory) {
                return "/api/complaints/evidence/files/" + file.getOriginalFilename();
            }

            @Override
            public org.springframework.core.io.Resource loadFileAsResource(String filename, String subDirectory) {
                return null;
            }

            @Override
            public void deleteFile(String filename, String subDirectory) {
            }
        };

        complaintService = new ComplaintService(
                complaintRepository,
                historyRepository,
                evidenceRepository,
                photoRepository,
                userRepository,
                auditService,
                storageService,
                null,
                null,
                null,
                null
        );
        complaintService.setEvidenceLocationLimits(100.0, 100.0);
    }

    private List<MultipartFile> dummyFiles() {
        return List.of(new MockMultipartFile("files", "repair.jpg", "image/jpeg", new byte[]{1, 2, 3}));
    }

    @Test
    @DisplayName("Test 1: Evidence captured at ~20m distance evaluates to WITHIN_RANGE")
    void testEvidenceWithinRange() {
        ComplaintResponse resp = complaintService.submitEvidence(
                complaintWithCoords.getId().toString(),
                "Pothole patched with cold mix asphalt",
                dummyFiles(),
                NEAR_LAT,
                BASE_LON,
                new BigDecimal("15.0"), // 15m accuracy
                null, // note not required for WITHIN_RANGE
                true,
                workerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(resp);
        assertEquals(ComplaintStatus.RESOLUTION_SUBMITTED.name(), resp.getStatus());
        assertEquals(1, savedEvidenceList.size());
        ResolutionEvidence ev = savedEvidenceList.get(0);
        assertEquals(LocationCheck.WITHIN_RANGE, ev.getLocationCheck());
        assertNotNull(ev.getDistanceMeters());
        assertTrue(ev.getDistanceMeters().doubleValue() < 30.0);
        assertTrue(auditLogged.get());
    }

    @Test
    @DisplayName("Test 2: Evidence at ~500m evaluates to OUT_OF_RANGE with note required")
    void testEvidenceOutOfRange() {
        // Without note or note < 10 chars -> 400 BadRequestException
        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(),
                        "Fixed",
                        dummyFiles(),
                        FAR_LAT,
                        BASE_LON,
                        new BigDecimal("10.0"),
                        null,
                        true,
                        workerPrincipal,
                        "127.0.0.1"
                )
        );

        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(),
                        "Fixed",
                        dummyFiles(),
                        FAR_LAT,
                        BASE_LON,
                        new BigDecimal("10.0"),
                        "Too short", // 9 chars
                        true,
                        workerPrincipal,
                        "127.0.0.1"
                )
        );

        // With >= 10 chars explanation note -> succeeds with OUT_OF_RANGE
        ComplaintResponse resp = complaintService.submitEvidence(
                complaintWithCoords.getId().toString(),
                "Fixed the leak at the corner",
                dummyFiles(),
                FAR_LAT,
                BASE_LON,
                new BigDecimal("10.0"),
                "Work done at pump house 500m up the line",
                true,
                workerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(resp);
        assertEquals(1, savedEvidenceList.size());
        ResolutionEvidence ev = savedEvidenceList.get(0);
        assertEquals(LocationCheck.OUT_OF_RANGE, ev.getLocationCheck());
        assertTrue(ev.getDistanceMeters().doubleValue() > 400.0);
        assertEquals("Work done at pump house 500m up the line", ev.getLocationNote());
    }

    @Test
    @DisplayName("Test 3: Accuracy of 300m (> 100m limit) evaluates to LOW_ACCURACY with note required")
    void testEvidenceLowAccuracy() {
        // Without note -> 400
        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(),
                        "Patch completed",
                        dummyFiles(),
                        NEAR_LAT,
                        BASE_LON,
                        new BigDecimal("300.0"), // 300m accuracy > 100m limit
                        null,
                        true,
                        workerPrincipal,
                        "127.0.0.1"
                )
        );

        // With valid note -> succeeds with LOW_ACCURACY
        ComplaintResponse resp = complaintService.submitEvidence(
                complaintWithCoords.getId().toString(),
                "Patch completed",
                dummyFiles(),
                NEAR_LAT,
                BASE_LON,
                new BigDecimal("300.0"),
                "Heavy cloud cover and tall buildings degraded GPS signal",
                true,
                workerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(resp);
        assertEquals(1, savedEvidenceList.size());
        ResolutionEvidence ev = savedEvidenceList.get(0);
        assertEquals(LocationCheck.LOW_ACCURACY, ev.getLocationCheck());
        assertEquals("Heavy cloud cover and tall buildings degraded GPS signal", ev.getLocationNote());
    }

    @Test
    @DisplayName("Test 4: No coordinates provided evaluates to NOT_PROVIDED with note required")
    void testEvidenceNotProvided() {
        // Without note -> 400
        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(),
                        "Done",
                        dummyFiles(),
                        null,
                        null,
                        null,
                        null,
                        false,
                        workerPrincipal,
                        "127.0.0.1"
                )
        );

        // With valid note -> succeeds with NOT_PROVIDED
        ComplaintResponse resp = complaintService.submitEvidence(
                complaintWithCoords.getId().toString(),
                "Done",
                dummyFiles(),
                null,
                null,
                null,
                "Device browser location permission denied by security policy",
                false,
                workerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(resp);
        assertEquals(1, savedEvidenceList.size());
        ResolutionEvidence ev = savedEvidenceList.get(0);
        assertEquals(LocationCheck.NOT_PROVIDED, ev.getLocationCheck());
        assertNull(ev.getDistanceMeters());
    }

    @Test
    @DisplayName("Test 5: Invalid coordinates (out of bounds, 0/0, negative accuracy) return 400")
    void testInvalidCoordinates() {
        // Latitude > 90
        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(), "Note", dummyFiles(),
                        new BigDecimal("91.0"), BASE_LON, new BigDecimal("10.0"), "Valid note here", true, workerPrincipal, "127.0.0.1"
                )
        );

        // Longitude > 180
        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(), "Note", dummyFiles(),
                        BASE_LAT, new BigDecimal("181.0"), new BigDecimal("10.0"), "Valid note here", true, workerPrincipal, "127.0.0.1"
                )
        );

        // Exact (0, 0)
        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(), "Note", dummyFiles(),
                        BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("10.0"), "Valid note here", true, workerPrincipal, "127.0.0.1"
                )
        );

        // Negative accuracy
        assertThrows(BadRequestException.class, () ->
                complaintService.submitEvidence(
                        complaintWithCoords.getId().toString(), "Note", dummyFiles(),
                        BASE_LAT, BASE_LON, new BigDecimal("-5.0"), "Valid note here", true, workerPrincipal, "127.0.0.1"
                )
        );
    }

    @Test
    @DisplayName("Test 6: Complaint without coordinates evaluates to NOT_CHECKABLE")
    void testComplaintWithoutCoordinates() {
        ComplaintResponse resp = complaintService.submitEvidence(
                complaintWithoutCoords.getId().toString(),
                "Sanitation cleared",
                dummyFiles(),
                BASE_LAT,
                BASE_LON,
                new BigDecimal("10.0"),
                null, // not required for NOT_CHECKABLE
                true,
                workerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(resp);
        assertEquals(1, savedEvidenceList.size());
        ResolutionEvidence ev = savedEvidenceList.get(0);
        assertEquals(LocationCheck.NOT_CHECKABLE, ev.getLocationCheck());
        assertNull(ev.getDistanceMeters());
    }

    @Test
    @DisplayName("Test 7: Officer approval of flagged evidence requires acknowledgement")
    void testOfficerApprovalAcknowledgement() {
        // Submit OUT_OF_RANGE evidence
        complaintService.submitEvidence(
                complaintWithCoords.getId().toString(),
                "Repaired water main valve",
                dummyFiles(),
                FAR_LAT,
                BASE_LON,
                new BigDecimal("10.0"),
                "Valve was located 500m down the junction",
                true,
                workerPrincipal,
                "127.0.0.1"
        );

        assertEquals(ComplaintStatus.RESOLUTION_SUBMITTED, complaintWithCoords.getStatus());

        // Officer tries to verify without acknowledgement -> 400
        UpdateStatusRequest reqWithoutAck = new UpdateStatusRequest();
        reqWithoutAck.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        reqWithoutAck.setVersion(complaintWithCoords.getVersion());

        assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintWithCoords.getId().toString(), reqWithoutAck, officerPrincipal, "127.0.0.1")
        );

        // Officer provides short acknowledgement (< 10 chars) -> 400
        UpdateStatusRequest reqShortAck = new UpdateStatusRequest();
        reqShortAck.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        reqShortAck.setVersion(complaintWithCoords.getVersion());
        reqShortAck.setLocationAcknowledgement("Too short");

        assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintWithCoords.getId().toString(), reqShortAck, officerPrincipal, "127.0.0.1")
        );

        // Officer provides valid acknowledgement (>= 10 chars) -> 200 and audit logged
        UpdateStatusRequest reqValidAck = new UpdateStatusRequest();
        reqValidAck.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        reqValidAck.setVersion(complaintWithCoords.getVersion());
        reqValidAck.setLocationAcknowledgement("Inspected satellite photos; confirmed the shutoff valve is indeed 500m up-pipe.");

        ComplaintResponse approvedResp = complaintService.transitionStatus(
                complaintWithCoords.getId().toString(),
                reqValidAck,
                officerPrincipal,
                "127.0.0.1"
        );

        assertNotNull(approvedResp);
        assertEquals(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION.name(), approvedResp.getStatus());
        assertTrue(auditDetailsList.stream().anyMatch(d -> d.contains("Location Acknowledged: Inspected satellite photos")));
    }

    @Test
    @DisplayName("Test 8: Re-submitted evidence after rework is checked independently")
    void testResubmittedEvidenceAfterRework() {
        // 1st submission: OUT_OF_RANGE
        complaintService.submitEvidence(
                complaintWithCoords.getId().toString(),
                "First try",
                dummyFiles(),
                FAR_LAT,
                BASE_LON,
                new BigDecimal("10.0"),
                "Wrong location accidentally",
                true,
                workerPrincipal,
                "127.0.0.1"
        );
        assertEquals(LocationCheck.OUT_OF_RANGE, savedEvidenceList.get(0).getLocationCheck());

        // Approval of OUT_OF_RANGE evidence without valid acknowledgement must be rejected with 400 Bad Request
        UpdateStatusRequest unackReq = new UpdateStatusRequest();
        unackReq.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        unackReq.setVersion(complaintWithCoords.getVersion());
        assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintWithCoords.getId().toString(), unackReq, officerPrincipal, "127.0.0.1")
        );

        unackReq.setLocationAcknowledgement("Too short");
        assertThrows(BadRequestException.class, () ->
                complaintService.transitionStatus(complaintWithCoords.getId().toString(), unackReq, officerPrincipal, "127.0.0.1")
        );

        // Officer requests rework
        UpdateStatusRequest reworkReq = new UpdateStatusRequest();
        reworkReq.setStatus(ComplaintStatus.REWORK_REQUESTED);
        reworkReq.setNotes("Please take photos at the exact pothole location");
        reworkReq.setVersion(complaintWithCoords.getVersion());
        complaintService.transitionStatus(complaintWithCoords.getId().toString(), reworkReq, officerPrincipal, "127.0.0.1");

        // Worker moves to IN_PROGRESS
        UpdateStatusRequest inProgReq = new UpdateStatusRequest();
        inProgReq.setStatus(ComplaintStatus.IN_PROGRESS);
        inProgReq.setVersion(complaintWithCoords.getVersion());
        complaintService.transitionStatus(complaintWithCoords.getId().toString(), inProgReq, workerPrincipal, "127.0.0.1");

        // 2nd submission: WITHIN_RANGE
        complaintService.submitEvidence(
                complaintWithCoords.getId().toString(),
                "Second try at correct location",
                dummyFiles(),
                NEAR_LAT,
                BASE_LON,
                new BigDecimal("12.0"),
                null,
                true,
                workerPrincipal,
                "127.0.0.1"
        );

        assertEquals(2, savedEvidenceList.size());
        ResolutionEvidence secondEv = savedEvidenceList.get(1);
        secondEv.setCreatedAt(savedEvidenceList.get(0).getCreatedAt().plusSeconds(10));
        assertEquals(LocationCheck.WITHIN_RANGE, secondEv.getLocationCheck());

        // Now officer approves: because the latest evidence is WITHIN_RANGE, NO acknowledgement is required!
        UpdateStatusRequest approveReq = new UpdateStatusRequest();
        approveReq.setStatus(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION);
        approveReq.setVersion(complaintWithCoords.getVersion());

        ComplaintResponse approvedResp = complaintService.transitionStatus(
                complaintWithCoords.getId().toString(),
                approveReq,
                officerPrincipal,
                "127.0.0.1"
        );

        assertEquals(ComplaintStatus.PENDING_CITIZEN_CONFIRMATION.name(), approvedResp.getStatus());
    }
}
