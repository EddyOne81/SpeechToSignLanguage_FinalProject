package com.signlanguage.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import com.signlanguage.entity.UserSignLanguage;

@Repository
public interface UserSLRepository extends JpaRepository<UserSignLanguage, Long> {
    Optional<UserSignLanguage> findByUsername(String username);
    Optional<UserSignLanguage> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO user_roles (user_id, role_id) SELECT :userId, :roleId WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = :userId AND role_id = :roleId)", nativeQuery = true)
    void assignRoleIfNotExists(@Param("userId") Long userId, @Param("roleId") Long roleId);
}