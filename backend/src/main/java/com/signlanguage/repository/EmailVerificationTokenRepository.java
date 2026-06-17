package com.signlanguage.repository;

import com.signlanguage.entity.EmailVerificationToken;
import com.signlanguage.entity.UserSignLanguage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByToken(String token);

    @Modifying
    @Transactional
    @Query("DELETE FROM EmailVerificationToken t WHERE t.user = :user")
    void deleteByUser(UserSignLanguage user);
}
