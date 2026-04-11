package com.signlanguage.dto;

import lombok.Data;

@Data
public class UpsertPermissionRequest {
    private String code;
    private String name;
    private String module;
    private String description;
}