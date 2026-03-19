package com.signlanguage.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.signlanguage.model.SignDictionary;

@Repository
public interface SignDictionaryRepository extends JpaRepository<SignDictionary, Long> {
    Optional<SignDictionary> findByEnglishTextIgnoreCase(String text);
}
