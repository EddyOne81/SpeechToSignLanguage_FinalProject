package com.signlanguage.service;

import com.signlanguage.entity.SignDictionary;
import com.signlanguage.entity.TranslationHistory;
import com.signlanguage.entity.UserSignLanguage;
import com.signlanguage.repository.SignDictionaryRepository;
import com.signlanguage.repository.TranslationHistoryRepository;
import com.signlanguage.repository.UserFeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TranslationHistoryService {

	private final TranslationHistoryRepository historyRepository;
	private final SignDictionaryRepository dictionaryRepository;
	private final CurrentUserService currentUserService;
	private final UserFeedbackRepository feedbackRepository;

	@Transactional(readOnly = true)
	public Page<Map<String, Object>> getMyHistories(String query, Pageable pageable) {
		UserSignLanguage user = currentUserService.requireCurrentUser();
		if (query != null && !query.isBlank()) {
			return historyRepository.findByUserUserIdAndInputTextContainingIgnoreCaseOrderByCreatedAtDesc(user.getUserId(), query, pageable)
					.map(this::toResponse);
		}
		return historyRepository.findByUserUserIdOrderByCreatedAtDesc(user.getUserId(), pageable)
				.map(this::toResponse);
	}

	@Transactional(readOnly = true)
	public Map<String, Object> getMyHistory(Long historyId) {
		UserSignLanguage user = currentUserService.requireCurrentUser();
		TranslationHistory history = historyRepository.findByHistoryIdAndUserUserId(historyId, user.getUserId())
				.orElseThrow(() -> new RuntimeException("History not found"));
		return toResponse(history);
	}

	@Transactional
	public Map<String, Object> createMyHistory(Long wordId, String inputText, String fswResult, String poseFilePath, Integer processingTimeMs) {
		UserSignLanguage user = currentUserService.requireCurrentUser();

		TranslationHistory history = TranslationHistory.builder()
				.user(user)
				.word(resolveWord(wordId))
				.inputText(inputText)
				.poseFilePath(poseFilePath)
				.processingTimeMs(processingTimeMs)
				.build();

		historyRepository.save(history);
		return toResponse(history);
	}

	@Transactional
	public Map<String, Object> updateMyHistory(Long historyId, Long wordId, String inputText, String fswResult, String poseFilePath, Integer processingTimeMs) {
		UserSignLanguage user = currentUserService.requireCurrentUser();
		TranslationHistory history = historyRepository.findByHistoryIdAndUserUserId(historyId, user.getUserId())
				.orElseThrow(() -> new RuntimeException("History not found"));

		if (wordId != null) {
			history.setWord(resolveWord(wordId));
		}
		if (inputText != null) {
			history.setInputText(inputText);
		}
		if (poseFilePath != null) {
			history.setPoseFilePath(poseFilePath);
		}
		if (processingTimeMs != null) {
			history.setProcessingTimeMs(processingTimeMs);
		}

		historyRepository.save(history);
		return toResponse(history);
	}

	@Transactional
	public Map<String, Object> deleteMyHistory(Long historyId) {
		UserSignLanguage user = currentUserService.requireCurrentUser();
		historyRepository.findByHistoryIdAndUserUserId(historyId, user.getUserId())
				.orElseThrow(() -> new RuntimeException("History not found"));
		feedbackRepository.deleteByHistoryHistoryId(historyId);
		long deleted = historyRepository.deleteByHistoryIdAndUserUserId(historyId, user.getUserId());
		return Map.of("deleted", deleted > 0);
	}

	@Transactional
	public Map<String, Object> deleteAllMyHistories() {
		UserSignLanguage user = currentUserService.requireCurrentUser();
		feedbackRepository.deleteByHistoryUserUserId(user.getUserId());
		long deleted = historyRepository.deleteByUserUserId(user.getUserId());
		return Map.of("deletedCount", deleted);
	}

	@Transactional(readOnly = true)
	public Page<Map<String, Object>> getAll(Pageable pageable) {
		return historyRepository.findAll(pageable).map(this::toResponse);
	}

	@Transactional
	public void saveFromGatewayIfAuthenticated(
			String inputText,
			String fswResult,
			String poseFilePath,
			Integer processingTimeMs,
			Long wordId
	) {
		UserSignLanguage user;
		try {
			user = currentUserService.requireCurrentUser();
		} catch (RuntimeException ex) {
			return;
		}

		TranslationHistory history = TranslationHistory.builder()
				.user(user)
				.word(resolveWord(wordId))
				.inputText(inputText)
				.poseFilePath(poseFilePath)
				.processingTimeMs(processingTimeMs)
				.build();

		historyRepository.save(history);
	}

	private SignDictionary resolveWord(Long wordId) {
		if (wordId == null) {
			return null;
		}
		return dictionaryRepository.findById(wordId)
				.orElseThrow(() -> new RuntimeException("Dictionary word not found"));
	}

	private Map<String, Object> toResponse(TranslationHistory history) {
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("historyId", history.getHistoryId());
		result.put("userId", history.getUser() == null ? null : history.getUser().getUserId());
		result.put("wordId", history.getWord() == null ? null : history.getWord().getWordId());
		result.put("inputText", history.getInputText() == null ? "" : history.getInputText());
		result.put("poseFilePath", history.getPoseFilePath() == null ? "" : history.getPoseFilePath());
		result.put("processingTimeMs", history.getProcessingTimeMs() == null ? 0 : history.getProcessingTimeMs());
		result.put("createdAt", history.getCreatedAt());
		return result;
	}
}
