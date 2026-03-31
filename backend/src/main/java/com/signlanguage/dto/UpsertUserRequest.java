package com.signlanguage.dto;

import lombok.Data;

import java.util.Set;

@Data
public class UpsertUserRequest {
    private String username;
    private String email;
    private String password;
    private Set<String> roleCodes;
}