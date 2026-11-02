package com.civicfix.config;

import com.civicfix.security.CustomUserDetailsService;
import com.civicfix.security.RestAccessDeniedHandler;
import com.civicfix.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    @Value("${civicfix.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public SecurityConfig(CustomUserDetailsService userDetailsService,
                          RestAuthenticationEntryPoint authenticationEntryPoint,
                          RestAccessDeniedHandler accessDeniedHandler) {
        this.userDetailsService = userDetailsService;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName(null);

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Cookie-based CSRF protection with readable XSRF-TOKEN for frontend SPA
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(requestHandler)
                .ignoringRequestMatchers("/api/auth/login", "/api/auth/register", "/api/health", "/actuator/**")
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(2)
            )
            .authorizeHttpRequests(auth -> auth
                // Public Health & Pre-flight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/health", "/actuator/health", "/actuator/info").permitAll()

                // Public Authentication
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()

                // Authenticated User Session operations
                .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()

                // Role-Specific Workspaces
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/officer/analytics/trust").hasAnyRole("OFFICER", "SUPERVISOR", "ADMIN")
                .requestMatchers("/api/officer/**").hasAnyRole("OFFICER", "ADMIN")
                .requestMatchers("/api/supervisor/**").hasAnyRole("SUPERVISOR", "ADMIN")
                // Public Sanitized Complaint GIS Map Feed & GIS Services & Public Transparency Trust Scores & Features
                .requestMatchers(HttpMethod.GET, "/api/complaints/public/map").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/complaints/public/trust").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/gis/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()

                // Complaints: accessible by authenticated users with fine-grained service-layer ownership checks
                .requestMatchers("/api/complaints/**").authenticated()

                // In-App Notifications: strictly accessible by authenticated users with tenant-isolated ownership
                .requestMatchers("/api/notifications/**").authenticated()

                .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN", "X-Requested-With", "Accept"));
        config.setExposedHeaders(List.of("X-XSRF-TOKEN", "Set-Cookie", "Retry-After"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
