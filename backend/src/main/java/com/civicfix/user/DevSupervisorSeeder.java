package com.civicfix.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Component
@Profile("dev")
public class DevSupervisorSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSupervisorSeeder.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public DevSupervisorSeeder(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = "sarah.jenkins@metro.gov";
        if (userRepository.existsByEmailIgnoreCase(email)) {
            log.info("Supervisor dev account {} already exists. Skipping seed.", email);
            return;
        }

        Role supervisorRole = roleRepository.findByName(RoleName.SUPERVISOR)
                .orElseGet(() -> {
                    Role r = new Role(RoleName.SUPERVISOR);
                    return roleRepository.save(r);
                });

        User supervisor = new User();
        supervisor.setFullName("Sarah Jenkins");
        supervisor.setEmail(email);
        supervisor.setPhone("+91 98405 67890");
        supervisor.setPasswordHash(passwordEncoder.encode("Password123!"));
        supervisor.setDepartment("Municipal Operations Command");
        supervisor.setWard("City Central, Greater Chennai");
        supervisor.setAccountStatus("ACTIVE");
        supervisor.setTrustScore(100);
        supervisor.setRoles(Set.of(supervisorRole));

        userRepository.save(supervisor);
        log.info("Provisioned dev supervisor account: {} ({})", supervisor.getFullName(), email);
    }
}
