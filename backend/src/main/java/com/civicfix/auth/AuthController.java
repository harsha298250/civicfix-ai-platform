package com.civicfix.auth;

import com.civicfix.auth.dto.AuthUserResponse;
import com.civicfix.auth.dto.LoginRequest;
import com.civicfix.auth.dto.RegisterCitizenRequest;
import com.civicfix.common.ApiResponse;
import com.civicfix.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthUserResponse>> register(
            @Valid @RequestBody RegisterCitizenRequest request,
            HttpServletRequest httpRequest) {
        AuthUserResponse response = authService.registerCitizen(request, httpRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Citizen account registered successfully.", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthUserResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthUserResponse response = authService.login(request, httpRequest, httpResponse);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful.", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthUserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {
        AuthUserResponse response = authService.getCurrentUser(principal);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse,
            @AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(httpRequest, httpResponse, principal);
        return ResponseEntity.ok(ApiResponse.success("Signed out successfully.", null));
    }
}
