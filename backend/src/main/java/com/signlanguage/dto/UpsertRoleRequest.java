package com.signlanguage.dto;

import lombok.Data;

import java.util.Set;

@Data
public class UpsertRoleRequest {
    private String code;
    private String name;
    private String description;
    private Boolean isSystem;
    private Set<String> permissionCodes;
}