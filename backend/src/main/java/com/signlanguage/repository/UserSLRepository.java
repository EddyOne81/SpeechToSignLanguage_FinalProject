package com.signlanguage.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.signlanguage.entity.UserSignLanguage;

@Repository
public interface UserSLRepository extends JpaRepository<UserSignLanguage, Long> {
    Optional<UserSignLanguage> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}