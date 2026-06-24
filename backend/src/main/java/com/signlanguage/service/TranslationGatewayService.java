package com.signlanguage.service;

import com.signlanguage.entity.DictionaryCacheSource;
import com.signlanguage.entity.DictionaryEntryType;
import com.signlanguage.entity.SignDictionary;
import com.signlanguage.repository.SignDictionaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TranslationGatewayService {

    private final WebClient aiWebClient;
    private final TranslationHistoryService translationHistoryService;
    private final SignDictionaryRepository dictionaryRepository;

    @Value("${app.public-base-url:http://127.0.0.1:8080}")
    private String appPublicBaseUrl;

    @Value("${app.pose-cache-dir:data/pose_cache}")
    private String poseCacheDir;

    @Value("${app.auto-cache.phrase-enabled:false}")
    private boolean autoCachePhraseEnabled;

    @Value("${app.auto-cache.max-phrase-words:2}")
    private int autoCacheMaxPhraseWords;

        private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};
    private static final int DEFAULT_CACHE_FPS = 25;

    public Map<String, Object> translateText(String text, String spokenLang, String signedLang) {
        long startTime = System.currentTimeMillis();

        String cleanText = cleanText(text);
        if (cleanText == null || cleanText.isBlank()) {
            throw new RuntimeException("Text input cannot be empty");
        }

        String normalizedText = normalizeText(cleanText);
        String normalizedSpoken = normalizeLang(spokenLang, "en");
        String normalizedSigned = normalizeLang(signedLang, "ase");

        Optional<SignDictionary> cachedPhrase = findCachedEntry(
                normalizedText,
                guessEntryType(normalizedText),
                normalizedSpoken,
                normalizedSigned
        );

        if (cachedPhrase.isPresent()) {
            Map<String, Object> payload = buildCachedPayload(
                    cleanText,
                    cachedPhrase.get(),
                    normalizedSpoken,
                    normalizedSigned,
                    "cache-phrase"
            );
            saveHistoryIfAuthenticated(
                payload,
                cleanText,
                elapsedMs(startTime),
                cachedPhrase.get().getWordId()
            );
            return payload;
        }

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("text", cleanText);
        requestBody.put("spoken_lang", normalizedSpoken);
        requestBody.put("signed_lang", normalizedSigned);

        Map<String, Object> aiResponse;
        try {
            aiResponse = aiWebClient.post()
                    .uri("/api/v1/translate/text")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .blockOptional()
                    .orElseThrow(() -> new RuntimeException("Empty response from AI service"));
        } catch (RuntimeException ex) {
            throw new RuntimeException("AI service unavailable: " + ex.getMessage(), ex);
        } catch (Throwable ex) {
            throw new RuntimeException("AI service unavailable", ex);
        }

        Map<String, Object> payload = extractPayload(aiResponse);
        patchPoseSourceUrl(payload, cleanText, normalizedSpoken, normalizedSigned);
        overrideOfflineModeIfCached(payload, normalizedText, normalizedSpoken, normalizedSigned);
        autoCachePoseIfNeeded(cleanText, normalizedText, normalizedSpoken, normalizedSigned, payload);
        Optional<SignDictionary> linkedEntry = findCachedEntry(
            normalizedText,
            guessEntryType(normalizedText),
            normalizedSpoken,
            normalizedSigned
        );
        saveHistoryIfAuthenticated(
            payload,
            cleanText,
            elapsedMs(startTime),
            linkedEntry.map(SignDictionary::getWordId).orElse(null)
        );
        return payload;
    }

    public Map<String, Object> translateAudio(MultipartFile file, String spokenLang, String signedLang) {
        long startTime = System.currentTimeMillis();

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Audio file is required");
        }

        try {
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() == null ? "audio.webm" : file.getOriginalFilename();
                }
            };

            MultiValueMap<String, Object> multipartBody = new LinkedMultiValueMap<>();
            multipartBody.add("file", fileResource);

            Map<String, Object> aiResponse;
            try {
                aiResponse = aiWebClient.post()
                        .uri("/api/v1/translate/audio")
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(multipartBody))
                        .retrieve()
                        .bodyToMono(MAP_TYPE)
                        .blockOptional()
                        .orElseThrow(() -> new RuntimeException("Empty response from AI service"));
            } catch (RuntimeException ex) {
                throw new RuntimeException("AI service unavailable: " + ex.getMessage(), ex);
            } catch (Throwable ex) {
                throw new RuntimeException("AI service unavailable", ex);
            }

            Map<String, Object> payload = extractPayload(aiResponse);
            String recognizedText = asString(payload.get("recognized_text_en"));
            if (recognizedText == null || recognizedText.isBlank()) {
                recognizedText = "";
            }

            String normalizedSpoken = normalizeLang(spokenLang, "en");
            String normalizedSigned = normalizeLang(signedLang, "ase");

            patchPoseSourceUrl(payload, recognizedText, normalizedSpoken, normalizedSigned);
            overrideOfflineModeIfCached(payload, normalizeText(recognizedText), normalizedSpoken, normalizedSigned);
            autoCachePoseIfNeeded(
                    recognizedText,
                    normalizeText(recognizedText),
                    normalizedSpoken,
                    normalizedSigned,
                    payload
            );
            Optional<SignDictionary> linkedEntry = findCachedEntry(
                    normalizeText(recognizedText),
                    guessEntryType(normalizeText(recognizedText)),
                    normalizedSpoken,
                    normalizedSigned
            );
            saveHistoryIfAuthenticated(
                    payload,
                    recognizedText,
                    elapsedMs(startTime),
                    linkedEntry.map(SignDictionary::getWordId).orElse(null)
            );
            return payload;
        } catch (IOException ex) {
            throw new RuntimeException("Unable to read uploaded audio file");
        }
    }

    public byte[] proxyPose(String text, String spokenLang, String signedLang) {
        String cleanText = cleanText(text);
        if (cleanText == null || cleanText.isBlank()) {
            throw new RuntimeException("Text input cannot be empty");
        }

        String normalizedText = normalizeText(cleanText);
        String normalizedSpoken = normalizeLang(spokenLang, "en");
        String normalizedSigned = normalizeLang(signedLang, "ase");

        Optional<SignDictionary> cachedEntry = findCachedEntry(
                normalizedText,
                guessEntryType(normalizedText),
                normalizedSpoken,
                normalizedSigned
        );

        if (cachedEntry.isPresent()) {
            SignDictionary entry = cachedEntry.get();

            // Priority 1: binary stored in Supabase — survives Railway restarts
            if (entry.getPoseData() != null && entry.getPoseData().length > 0) {
                return entry.getPoseData();
            }

            // Priority 2: legacy disk cache (may exist if disk hasn't been wiped yet)
            Path cachedPath = resolvePosePath(entry.getPoseFilePath());
            if (cachedPath != null && Files.exists(cachedPath)) {
                try {
                    byte[] bytes = Files.readAllBytes(cachedPath);
                    // Back-fill Supabase so future requests survive restarts
                    savePoseDataToDb(entry, bytes);
                    return bytes;
                } catch (IOException ex) {
                    // Fall through to AI
                }
            }

            // Priority 3: fetch from AI and persist to Supabase
            byte[] bytes = fetchPoseBytesFromAi(cleanText, normalizedSpoken, normalizedSigned);
            savePoseDataToDb(entry, bytes);
            return bytes;
        }

        return fetchPoseBytesFromAi(cleanText, normalizedSpoken, normalizedSigned);
    }

    private void patchPoseSourceUrl(Map<String, Object> payload, String text, String spokenLang, String signedLang) {
        String cleanText = text == null ? "" : text.trim();
        if (cleanText.isBlank()) {
            return;
        }

        String proxyPoseUrl = buildProxyPoseUrl(cleanText, spokenLang, signedLang);
        payload.put("pose_source_url", proxyPoseUrl);

        Map<String, Object> ruleDebug = asMap(payload.get("rule_debug"));
        if (ruleDebug != null) {
            ruleDebug.put("pose_source_url", proxyPoseUrl);
            payload.put("rule_debug", ruleDebug);
        }
    }

        private void saveHistoryIfAuthenticated(
            Map<String, Object> payload,
            String inputText,
            int processingTimeMs,
            Long wordId
        ) {
        translationHistoryService.saveFromGatewayIfAuthenticated(
            inputText,
            asString(payload.get("fsw_code")),
            asString(payload.get("pose_source_url")),
            processingTimeMs,
            wordId
        );
        }

    private int elapsedMs(long startTime) {
        long elapsed = System.currentTimeMillis() - startTime;
        return elapsed > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) elapsed;
    }

    private String buildProxyPoseUrl(String text, String spokenLang, String signedLang) {
        return appPublicBaseUrl
                + "/api/translate/pose?text=" + urlEncode(text)
                + "&spoken=" + urlEncode(spokenLang)
                + "&signed=" + urlEncode(signedLang);
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private Optional<SignDictionary> findCachedEntry(
            String normalizedText,
            DictionaryEntryType entryType,
            String spokenLang,
            String signedLang
    ) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return Optional.empty();
        }

        Optional<SignDictionary> hit = dictionaryRepository
                .findFirstByNormalizedTextAndEntryTypeAndSpokenLangAndSignedLang(
                        normalizedText,
                        entryType,
                        spokenLang,
                        signedLang
                );

        if (hit.isPresent()) {
            return hit;
        }

        DictionaryEntryType fallback = entryType == DictionaryEntryType.PHRASE
                ? DictionaryEntryType.GLOSS
                : DictionaryEntryType.PHRASE;

        return dictionaryRepository
                .findFirstByNormalizedTextAndEntryTypeAndSpokenLangAndSignedLang(
                        normalizedText,
                        fallback,
                        spokenLang,
                        signedLang
                );
    }

    private Map<String, Object> buildCachedPayload(
            String text,
            SignDictionary dictionary,
            String spokenLang,
            String signedLang,
            String source
    ) {
        String poseSourceUrl = buildProxyPoseUrl(text, spokenLang, signedLang);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("recognized_text_en", text);
        payload.put("pose_coordinates", Collections.emptyList());
        payload.put("pose_source_url", poseSourceUrl);
        payload.put("fps", DEFAULT_CACHE_FPS);

        Map<String, Object> ruleDebug = new LinkedHashMap<>();
        ruleDebug.put("source", source);
        ruleDebug.put("pose_source_url", poseSourceUrl);
        ruleDebug.put("entry_type", dictionary.getEntryType() == null ? null : dictionary.getEntryType().name());
        ruleDebug.put("cache_source", dictionary.getCacheSource() == null ? null : dictionary.getCacheSource().name());
        ruleDebug.put("spoken_lang", spokenLang);
        ruleDebug.put("signed_lang", signedLang);
        payload.put("rule_debug", ruleDebug);

        return payload;
    }

    private void autoCachePoseIfNeeded(
            String cleanText,
            String normalizedText,
            String spokenLang,
            String signedLang,
            Map<String, Object> payload
    ) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return;
        }

        DictionaryEntryType entryType = guessEntryType(normalizedText);
        if (!shouldAutoCache(normalizedText, entryType)) {
            return;
        }
        Optional<SignDictionary> existing = dictionaryRepository
                .findFirstByNormalizedTextAndEntryTypeAndSpokenLangAndSignedLang(
                        normalizedText,
                        entryType,
                        spokenLang,
                        signedLang
                );

        if (existing.isPresent()) {
            // Back-fill Supabase binary for entries that only have a (now-missing) disk path.
            SignDictionary entry = existing.get();
            if (entry.getPoseData() != null) {
                return;
            }
            try {
                byte[] bytes = fetchPoseBytesFromAi(cleanText, spokenLang, signedLang);
                savePoseDataToDb(entry, bytes);
            } catch (RuntimeException ex) {
                // Non-critical — will retry on next translation.
            }
            return;
        }

        if (dictionaryRepository.existsByEnglishTextIgnoreCase(cleanText)) {
            return;
        }

        byte[] poseBytes;
        try {
            poseBytes = fetchPoseBytesFromAi(cleanText, spokenLang, signedLang);
        } catch (RuntimeException ex) {
            return;
        }

        SignDictionary dictionary = SignDictionary.builder()
                .englishText(cleanText)
                .normalizedText(normalizedText)
                .entryType(entryType)
                .spokenLang(spokenLang)
                .signedLang(signedLang)
                .cacheSource(DictionaryCacheSource.AUTO_CACHED)
                .poseData(poseBytes)
                .build();

        try {
            dictionaryRepository.save(dictionary);
        } catch (DataIntegrityViolationException ex) {
            // Another request already inserted the same entry.
        }
    }

    private void savePoseDataToDb(SignDictionary entry, byte[] bytes) {
        try {
            entry.setPoseData(bytes);
            dictionaryRepository.save(entry);
        } catch (Exception ex) {
            // Non-critical — binary is still served to the caller.
        }
    }

    private byte[] fetchPoseBytesFromAi(String text, String spokenLang, String signedLang) {
        return aiWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/v1/pose")
                        .queryParam("text", text)
                        .queryParam("spoken", spokenLang)
                        .queryParam("signed", signedLang)
                        .build())
                .accept(MediaType.parseMediaType("application/pose"))
                .retrieve()
                .bodyToMono(byte[].class)
                .blockOptional()
                .orElseThrow(() -> new RuntimeException("Empty pose payload from AI service"));
    }

    private Path savePoseFile(String normalizedText, String spokenLang, String signedLang, byte[] poseBytes) throws IOException {
        Path cacheBase = resolveCacheBase();
        Files.createDirectories(cacheBase);

        String fileName = sha1(normalizedText + "|" + spokenLang + "|" + signedLang) + ".pose";
        Path posePath = cacheBase.resolve(fileName);

        if (!Files.exists(posePath)) {
            Files.write(posePath, poseBytes);
        }

        return posePath;
    }

    private Path resolveCacheBase() {
        if (poseCacheDir == null || poseCacheDir.isBlank()) {
            poseCacheDir = "data/pose_cache";
        }

        Path configured = Paths.get(poseCacheDir);
        if (configured.isAbsolute()) {
            return configured.normalize();
        }

        Path projectRoot = resolveProjectRoot();
        return projectRoot.resolve(configured).normalize();
    }

    private Path resolvePosePath(String poseFilePath) {
        if (poseFilePath == null || poseFilePath.isBlank()) {
            return null;
        }

        Path raw = Paths.get(poseFilePath);
        if (raw.isAbsolute()) {
            return Files.exists(raw) ? raw : null;
        }

        Path projectRoot = resolveProjectRoot();
        Path candidate = projectRoot.resolve(raw).normalize();
        if (Files.exists(candidate)) {
            return candidate;
        }

        Path backendCandidate = projectRoot.resolve("backend").resolve(raw).normalize();
        if (Files.exists(backendCandidate)) {
            return backendCandidate;
        }

        Path parentCandidate = projectRoot.getParent() == null
                ? null
                : projectRoot.getParent().resolve(raw).normalize();
        if (parentCandidate != null && Files.exists(parentCandidate)) {
            return parentCandidate;
        }

        return null;
    }

    private Path resolveProjectRoot() {
        Path userDir = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        Path dirName = userDir.getFileName();
        if (dirName != null && dirName.toString().equalsIgnoreCase("backend")) {
            return userDir.getParent() == null ? userDir : userDir.getParent().normalize();
        }

        if (Files.exists(userDir.resolve("backend").resolve("pom.xml"))) {
            return userDir;
        }

        if (Files.exists(userDir.resolve("pom.xml"))) {
            return userDir;
        }

        return userDir;
    }

    private String sha1(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(bytes);
        } catch (Exception ex) {
            throw new RuntimeException("Unable to hash pose cache key");
        }
    }

    private DictionaryEntryType guessEntryType(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return DictionaryEntryType.GLOSS;
        }
        return normalizedText.contains(" ") ? DictionaryEntryType.PHRASE : DictionaryEntryType.GLOSS;
    }

    private boolean shouldAutoCache(String normalizedText, DictionaryEntryType entryType) {
        if (entryType != DictionaryEntryType.PHRASE) {
            return true;
        }
        if (!autoCachePhraseEnabled) {
            return false;
        }
        int maxWords = autoCacheMaxPhraseWords <= 0 ? 0 : autoCacheMaxPhraseWords;
        return countWords(normalizedText) <= maxWords;
    }

    private int countWords(String normalizedText) {
        if (normalizedText == null || normalizedText.isBlank()) {
            return 0;
        }
        return normalizedText.trim().split("\\s+").length;
    }

    private String normalizeText(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private String normalizeLang(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String cleanText(String text) {
        return text == null ? null : text.trim();
    }

    private Map<String, Object> extractPayload(Map<String, Object> responseBody) {
        if (responseBody == null) {
            throw new RuntimeException("AI service response is null");
        }

        Map<String, Object> wrappedData = asMap(responseBody.get("data"));
        if (wrappedData != null) {
            return wrappedData;
        }

        if (responseBody.containsKey("recognized_text_en") || responseBody.containsKey("pose_coordinates")) {
            return new LinkedHashMap<>(responseBody);
        }

        throw new RuntimeException("Invalid response format from AI service");
    }

    private Map<String, Object> asMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return null;
        }

        Map<String, Object> converted = new LinkedHashMap<>();
        rawMap.forEach((key, mapValue) -> converted.put(String.valueOf(key), mapValue));
        return converted;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private void overrideOfflineModeIfCached(
            Map<String, Object> payload,
            String normalizedText,
            String spokenLang,
            String signedLang
    ) {
        if (!Boolean.TRUE.equals(payload.get("offline_mode"))) {
            return;
        }
        if (normalizedText == null || normalizedText.isBlank()) {
            return;
        }
        Optional<SignDictionary> dbEntry = findCachedEntry(
                normalizedText,
                guessEntryType(normalizedText),
                spokenLang,
                signedLang
        );
        if (dbEntry.isPresent()
                && dbEntry.get().getPoseData() != null
                && dbEntry.get().getPoseData().length > 0) {
            payload.remove("offline_mode");
        }
    }
}
