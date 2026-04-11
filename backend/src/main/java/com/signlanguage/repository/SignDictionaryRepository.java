package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.signlanguage.entity.SignDictionary;

@Repository
public interface SignDictionaryRepository extends JpaRepository<SignDictionary, Long> {
    Optional<SignDictionary> findByEnglishTextIgnoreCase(String text);
    boolean existsByEnglishTextIgnoreCase(String text);
    Page<SignDictionary> findByEnglishTextContainingIgnoreCase(String q, Pageable pageable);
}
