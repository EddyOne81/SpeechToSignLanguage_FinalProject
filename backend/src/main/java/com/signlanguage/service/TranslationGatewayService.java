package com.signlanguage.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
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
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TranslationGatewayService {

    private final WebClient aiWebClient;
    private final TranslationHistoryService translationHistoryService;

    @Value("${app.public-base-url:http://127.0.0.1:8080}")
    private String appPublicBaseUrl;

    public Map<String, Object> translateText(String text, String spokenLang, String signedLang) {
        long startTime = System.currentTimeMillis();

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("text", text);
        requestBody.put("spoken_lang", spokenLang);
        requestBody.put("signed_lang", signedLang);

        Map<String, Object> aiResponse = aiWebClient.post()
                .uri("/api/v1/translate/text")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .blockOptional()
                .orElseThrow(() -> new RuntimeException("Empty response from AI service"));

        Map<String, Object> payload = extractPayload(aiResponse);
        patchPoseSourceUrl(payload, text, spokenLang, signedLang);
        saveHistoryIfAuthenticated(payload, text, elapsedMs(startTime));
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

            Map<String, Object> aiResponse = aiWebClient.post()
                    .uri("/api/v1/translate/audio")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(multipartBody))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .blockOptional()
                    .orElseThrow(() -> new RuntimeException("Empty response from AI service"));

            Map<String, Object> payload = extractPayload(aiResponse);
            String recognizedText = asString(payload.get("recognized_text_en"));
            if (recognizedText == null || recognizedText.isBlank()) {
                recognizedText = "";
            }

            patchPoseSourceUrl(payload, recognizedText, spokenLang, signedLang);
            saveHistoryIfAuthenticated(payload, recognizedText, elapsedMs(startTime));
            return payload;
        } catch (IOException ex) {
            throw new RuntimeException("Unable to read uploaded audio file");
        }
    }

    public byte[] proxyPose(String text, String spokenLang, String signedLang) {
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

    private void saveHistoryIfAuthenticated(Map<String, Object> payload, String inputText, int processingTimeMs) {
        translationHistoryService.saveFromGatewayIfAuthenticated(
                inputText,
                asString(payload.get("fsw_code")),
                asString(payload.get("pose_source_url")),
                processingTimeMs
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
}
