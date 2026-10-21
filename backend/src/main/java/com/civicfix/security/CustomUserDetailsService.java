package com.civicfix.security;

import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new UsernameNotFoundException("Identifier cannot be empty");
        }

        String trimmed = identifier.trim();

        // 1. Try finding by email
        User user = userRepository.findByEmailIgnoreCase(trimmed)
                // 2. Try finding by phone
                .or(() -> userRepository.findByPhone(trimmed))
                // 3. Try finding by normalized phone (strip spaces/dashes)
                .or(() -> {
                    String cleanPhone = trimmed.replaceAll("\\s+", "");
                    return userRepository.findByPhone(cleanPhone);
                })
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + identifier));

        return new UserPrincipal(user);
    }
}
