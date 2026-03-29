package com.signlanguage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.signlanguage.entity.TranslationHistory;

@Repository
public interface TranslationHistoryRepository extends JpaRepository<TranslationHistory, Long> {

}
