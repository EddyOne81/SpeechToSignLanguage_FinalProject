package com.signlanguage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

    @Value("${ai.server.max-in-memory-size:200MB}")
    private DataSize aiMaxInMemorySize;

    @Bean
    public WebClient aiWebClient() {
        int maxInMemoryBytes = (int) Math.min(aiMaxInMemorySize.toBytes(), Integer.MAX_VALUE);

        return WebClient.builder()
                .baseUrl(aiServerUrl)
                .codecs(configurer -> configurer
                        .defaultCodecs()
                    .maxInMemorySize(maxInMemoryBytes))
                .build();
    }
}
