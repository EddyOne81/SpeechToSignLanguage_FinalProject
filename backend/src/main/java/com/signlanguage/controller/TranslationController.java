package com.signlanguage.controller;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.signlanguage.exception.ApiResponses;
import com.signlanguage.service.TranslationGatewayService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/translate")
@RequiredArgsConstructor
@Validated
public class TranslationController {

    private final TranslationGatewayService translationGatewayService;

    @PostMapping("/text")
    public ResponseEntity<?> translateText(@Valid @RequestBody TranslateTextRequest request) {
        String text = request.getText().trim();
        String spokenLang = normalizeLang(request.getSpokenLang(), "en");
        String signedLang = normalizeLang(request.getSignedLang(), "ase");

        return ApiResponses.ok(translationGatewayService.translateText(text, spokenLang, signedLang));
    }

    @PostMapping(value = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> translateAudio(
            @RequestPart("file") MultipartFile file,
            @RequestParam(name = "spoken", defaultValue = "en") String spokenLang,
            @RequestParam(name = "signed", defaultValue = "ase") String signedLang
    ) {
        return ApiResponses.ok(translationGatewayService.translateAudio(
                file,
                normalizeLang(spokenLang, "en"),
                normalizeLang(signedLang, "ase")
        ));
    }

    @GetMapping(value = "/pose", produces = "application/pose")
    public ResponseEntity<byte[]> getPoseFile(
            @RequestParam("text") String text,
            @RequestParam(name = "spoken", defaultValue = "en") String spokenLang,
            @RequestParam(name = "signed", defaultValue = "ase") String signedLang
    ) {
        String cleanText = text == null ? "" : text.trim();
        if (cleanText.isBlank()) {
            throw new RuntimeException("Text input cannot be empty");
        }

        byte[] posePayload = translationGatewayService.proxyPose(
                cleanText,
                normalizeLang(spokenLang, "en"),
                normalizeLang(signedLang, "ase")
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/pose"))
                .body(posePayload);
    }

    private String normalizeLang(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    @Data
    public static class TranslateTextRequest {
        @NotBlank
        @Size(max = 2000, message = "Text must not exceed 2000 characters")
        private String text;

        @JsonAlias("spoken_lang")
        private String spokenLang = "en";

        @JsonAlias("signed_lang")
        private String signedLang = "ase";
    }
}
