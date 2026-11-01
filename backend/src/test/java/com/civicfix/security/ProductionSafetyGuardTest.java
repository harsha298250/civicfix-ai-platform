package com.civicfix.security;

import com.civicfix.user.Role;
import com.civicfix.user.RoleName;
import com.civicfix.user.User;
import com.civicfix.user.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class ProductionSafetyGuardTest {

    private UserRepository createFakeUserRepository(Map<UUID, User> store, List<User> savedList) {
        return (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName())) {
                        UUID id = (UUID) args[0];
                        return Optional.ofNullable(store.get(id));
                    }
                    if ("save".equals(method.getName())) {
                        User user = (User) args[0];
                        store.put(user.getId(), user);
                        if (savedList != null) {
                            savedList.add(user);
                        }
                        return user;
                    }
                    return null;
                }
        );
    }

    @Test
    @DisplayName("Prod Safety: Startup fails when DB password equals dev default")
    void refusesStartupWhenDbPasswordIsDevDefault() {
        UserRepository fakeRepo = createFakeUserRepository(new HashMap<>(), new ArrayList<>());
        ProductionSafetyGuard guard = new ProductionSafetyGuard(
                fakeRepo,
                "civicfix_dev_password_only",
                false
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, guard::validateDatabasePassword);
        assertTrue(ex.getMessage().contains("dev default"));
        assertTrue(ex.getMessage().contains("civicfix_dev_password_only"));

        // Also verify run() fails immediately before touching the repository
        assertThrows(IllegalStateException.class, () -> guard.run(null));
    }

    @Test
    @DisplayName("Prod Safety: Startup fails when DB password is null, empty, or blank")
    void refusesStartupWhenDbPasswordIsEmptyOrNull() {
        UserRepository fakeRepo = createFakeUserRepository(new HashMap<>(), new ArrayList<>());

        ProductionSafetyGuard guardNull = new ProductionSafetyGuard(fakeRepo, null, false);
        assertThrows(IllegalStateException.class, guardNull::validateDatabasePassword);

        ProductionSafetyGuard guardEmpty = new ProductionSafetyGuard(fakeRepo, "   ", false);
        assertThrows(IllegalStateException.class, guardEmpty::validateDatabasePassword);
    }

    @Test
    @DisplayName("Prod Safety: Startup succeeds when DB password is secure and non-default")
    void acceptsStartupWhenDbPasswordIsSecureAndNonDefault() {
        UserRepository fakeRepo = createFakeUserRepository(new HashMap<>(), new ArrayList<>());
        ProductionSafetyGuard guard = new ProductionSafetyGuard(
                fakeRepo,
                "ProdSecure#DbPass_2026!k9$",
                false
        );

        assertDoesNotThrow(guard::validateDatabasePassword);
    }

    @Test
    @DisplayName("Prod Safety: Disables all four V2 seed accounts when ALLOW_SEED_ACCOUNTS is false")
    void disablesAllFourSeedAccountsWhenAllowSeedAccountsIsFalse() {
        Map<UUID, User> store = new HashMap<>();
        List<User> savedUsers = new ArrayList<>();

        for (UUID seedId : ProductionSafetyGuard.V2_SEED_ACCOUNT_IDS) {
            User mockUser = new User();
            mockUser.setId(seedId);
            mockUser.setEmail("seed." + seedId.toString().substring(0, 8) + "@metro.gov");
            mockUser.setAccountStatus("ACTIVE");
            store.put(seedId, mockUser);
        }

        UserRepository fakeRepo = createFakeUserRepository(store, savedUsers);

        ProductionSafetyGuard guard = new ProductionSafetyGuard(
                fakeRepo,
                "ProdSecure#DbPass_2026!k9$",
                false
        );

        int disabledCount = guard.enforceSeedAccountPolicy();
        assertEquals(4, disabledCount);
        assertEquals(4, savedUsers.size());

        for (User savedUser : savedUsers) {
            assertEquals("DISABLED", savedUser.getAccountStatus(), "Seed account must be set to DISABLED");
        }
    }

    @Test
    @DisplayName("Prod Safety: Leaves seed accounts active when ALLOW_SEED_ACCOUNTS is explicitly true")
    void retainsSeedAccountsWhenAllowSeedAccountsIsTrue() {
        Map<UUID, User> store = new HashMap<>();
        List<User> savedUsers = new ArrayList<>();

        for (UUID seedId : ProductionSafetyGuard.V2_SEED_ACCOUNT_IDS) {
            User mockUser = new User();
            mockUser.setId(seedId);
            mockUser.setEmail("seed." + seedId.toString().substring(0, 8) + "@metro.gov");
            mockUser.setAccountStatus("ACTIVE");
            store.put(seedId, mockUser);
        }

        UserRepository fakeRepo = createFakeUserRepository(store, savedUsers);

        ProductionSafetyGuard guard = new ProductionSafetyGuard(
                fakeRepo,
                "ProdSecure#DbPass_2026!k9$",
                true
        );

        int disabledCount = guard.enforceSeedAccountPolicy();
        assertEquals(0, disabledCount);
        assertEquals(0, savedUsers.size());
    }

    @Test
    @DisplayName("Prod Safety: Disabled account cannot login (UserPrincipal.isEnabled is false)")
    void disabledSeedAccountCannotLogin() {
        User disabledUser = new User();
        disabledUser.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        disabledUser.setEmail("alex.m@citizen.org");
        disabledUser.setPasswordHash("$2a$10$vd5MDvWnGAYUrw8W.y2rPexBtLsSVkVVMb.hq2z037IWNJ8oID59q");
        disabledUser.setAccountStatus("DISABLED");

        Role citizenRole = new Role(RoleName.CITIZEN);
        disabledUser.setRoles(Set.of(citizenRole));

        UserPrincipal principal = new UserPrincipal(disabledUser);
        assertFalse(principal.isEnabled(), "A user with status DISABLED must have isEnabled() == false");
    }
}
