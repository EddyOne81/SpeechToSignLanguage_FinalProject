package com.signlanguage.service;

import com.signlanguage.dto.UpsertDictionaryRequest;
import com.signlanguage.entity.SignDictionary;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.SignDictionaryRepository;
import com.signlanguage.repository.UserSLRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SignDictionaryService {

    private final SignDictionaryRepository dictionaryRepository;
    private final UserSLRepository userRepository;

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> search(String q, Pageable pageable) {
        Page<SignDictionary> data = (q == null || q.isBlank())
                ? dictionaryRepository.findAll(pageable)
                : dictionaryRepository.findByEnglishTextContainingIgnoreCase(q, pageable);

        return data.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(Long id) {
        SignDictionary dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dictionary item not found"));
        return toResponse(dictionary);
    }

    @Transactional
    public Map<String, Object> create(UpsertDictionaryRequest request) {
        validateRequired(request);
        if (dictionaryRepository.existsByEnglishTextIgnoreCase(request.getEnglishText())) {
            throw new RuntimeException("Dictionary text already exists");
        }

        SignDictionary dictionary = SignDictionary.builder()
                .englishText(request.getEnglishText())
                .fswCode(request.getFswCode())
                .poseFilePath(request.getPoseFilePath())
                .isVerified(request.getIsVerified() == null ? false : request.getIsVerified())
                .verifiedBy(resolveVerifiedBy(request.getVerifiedByUserId()))
                .build();

        dictionaryRepository.save(dictionary);
        return toResponse(dictionary);
    }

    @Transactional
    public Map<String, Object> update(Long id, UpsertDictionaryRequest request) {
        SignDictionary dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dictionary item not found"));

        if (request.getEnglishText() != null && !request.getEnglishText().isBlank()) {
            dictionary.setEnglishText(request.getEnglishText());
        }
        if (request.getFswCode() != null) {
            dictionary.setFswCode(request.getFswCode());
        }
        if (request.getPoseFilePath() != null) {
            dictionary.setPoseFilePath(request.getPoseFilePath());
        }
        if (request.getIsVerified() != null) {
            dictionary.setIsVerified(request.getIsVerified());
        }
        if (request.getVerifiedByUserId() != null) {
            dictionary.setVerifiedBy(resolveVerifiedBy(request.getVerifiedByUserId()));
        }

        dictionaryRepository.save(dictionary);
        return toResponse(dictionary);
    }

    @Transactional
    public Map<String, Object> delete(Long id) {
        if (!dictionaryRepository.existsById(id)) {
            throw new RuntimeException("Dictionary item not found");
        }
        dictionaryRepository.deleteById(id);
        return Map.of("deleted", true);
    }

    private void validateRequired(UpsertDictionaryRequest request) {
        if (request.getEnglishText() == null || request.getEnglishText().isBlank()) {
            throw new RuntimeException("englishText is required");
        }
    }

    private UserSignLanguage resolveVerifiedBy(Long verifiedByUserId) {
        if (verifiedByUserId == null) {
            return null;
        }

        return userRepository.findById(verifiedByUserId)
                .orElseThrow(() -> new RuntimeException("Verifier user not found"));
    }

    private Map<String, Object> toResponse(SignDictionary dictionary) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("wordId", dictionary.getWordId());
        result.put("englishText", dictionary.getEnglishText());
        result.put("fswCode", dictionary.getFswCode() == null ? "" : dictionary.getFswCode());
        result.put("poseFilePath", dictionary.getPoseFilePath() == null ? "" : dictionary.getPoseFilePath());
        result.put("isVerified", dictionary.getIsVerified() == null ? false : dictionary.getIsVerified());
        result.put("verifiedByUserId", dictionary.getVerifiedBy() == null ? null : dictionary.getVerifiedBy().getUserId());
        return result;
    }
}