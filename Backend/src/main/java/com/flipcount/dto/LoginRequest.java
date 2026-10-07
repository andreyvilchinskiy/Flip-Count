package com.flipcount.dto;

import lombok.Data;

/** Данные входа. */
@Data
public class LoginRequest {
    private String email;
    private String password;
}