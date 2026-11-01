package com.civicfix.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByPhone(String phone);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByPhone(String phone);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.accountStatus = 'ACTIVE'")
    List<User> findActiveUsersByRoleName(@Param("roleName") RoleName roleName);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName")
    long countByRoleName(@Param("roleName") RoleName roleName);

    long countByAccountStatusIgnoreCase(String accountStatus);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.roles r WHERE " +
           "(:roleName IS NULL OR r.name = :roleName) AND " +
           "(:status IS NULL OR LOWER(u.accountStatus) = LOWER(:status)) AND " +
           "(:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.ward) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(u.department) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findUsersWithFilters(
            @Param("roleName") RoleName roleName,
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable);
}
