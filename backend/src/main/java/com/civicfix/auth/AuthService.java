package com.civicfix.auth;

import com.civicfix.audit.AuditService;
import com.civicfix.auth.dto.AuthUserResponse;
import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.auth.dto.RegisterCitizenRequest;
import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ConflictException;
import com.civicfix.common.exception.ResourceNotFoundException;
import com.civicfix.security.UserPrincipal;
import com.civicfix.user.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AuditService auditService;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder.getContextHolderStrategy();

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.auditService = auditService;
    }

    @Transactional
    public AuthUserResponse registerCitizen(RegisterCitizenRequest request, String ipAddress) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        String phone = request.getPhone() != null ? request.getPhone().trim() : null;

        if ((email == null || email.isEmpty()) && (phone == null || phone.isEmpty())) {
            throw new BadRequestException("At least one contact method (email or phone number) must be provided.");
        }

        // Duplicate checks
        if (email != null && !email.isEmpty() && userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account is already registered with this email address.");
        }

        if (phone != null && !phone.isEmpty() && userRepository.existsByPhone(phone)) {
            throw new ConflictException("An account is already registered with this phone number.");
        }

        // Strictly assign CITIZEN role
        Role citizenRole = roleRepository.findByName(RoleName.CITIZEN)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.CITIZEN)));

        User user = new User();
        user.setFullName(request.getName().trim());
        user.setEmail(email != null && !email.isEmpty() ? email : null);
        user.setPhone(phone != null && !phone.isEmpty() ? phone : null);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setWard(request.getWard() != null ? request.getWard().trim() : "Ward 08, Anna Nagar, Chennai");
        user.setDepartment("Resident Community Member");
        user.setAccountStatus("ACTIVE");
        user.setTrustScore(90);
        user.setRoles(Set.of(citizenRole));

        User savedUser = userRepository.save(user);

        auditService.logAction(
                savedUser.getId(),
                savedUser.getFullName(),
                "CITIZEN",
                "AUTH_REGISTER",
                "USER",
                savedUser.getId().toString(),
                "Citizen self-registration completed.",
                ipAddress,
                "SUCCESS"
        );

        return AuthUserResponse.fromEntity(savedUser);
    }

    public AuthUserResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String identifier = request.getIdentifier().trim();

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, request.getPassword())
        );

        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found."));

        auditService.logAction(
                user.getId(),
                user.getFullName(),
                principal.getAuthorities().iterator().next().getAuthority(),
                "AUTH_LOGIN",
                "SESSION",
                httpRequest.getSession().getId(),
                "Successful user authentication.",
                httpRequest.getRemoteAddr(),
                "SUCCESS"
        );

        return AuthUserResponse.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(UserPrincipal principal) {
        if (principal == null) {
            throw new ResourceNotFoundException("No active session found.");
        }
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found in system."));
        return AuthUserResponse.fromEntity(user);
    }

    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse, UserPrincipal principal) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();

        if (principal != null) {
            auditService.logAction(
                    principal.getId(),
                    principal.getFullName(),
                    principal.getAuthorities().isEmpty() ? "ANONYMOUS" : principal.getAuthorities().iterator().next().getAuthority(),
                    "AUTH_LOGOUT",
                    "SESSION",
                    session != null ? session.getId() : "NONE",
                    "User signed out of session.",
                    httpRequest.getRemoteAddr(),
                    "SUCCESS"
            );
        }
    }
}
