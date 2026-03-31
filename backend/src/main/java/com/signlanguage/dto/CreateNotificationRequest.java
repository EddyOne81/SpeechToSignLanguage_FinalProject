package com.signlanguage.dto;

import lombok.Data;

@Data
public class CreateNotificationRequest {
    private Long userId;
    private String type;
    private String title;
    private String content;
    private String dataJson;
}