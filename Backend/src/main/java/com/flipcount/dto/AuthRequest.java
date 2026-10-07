package com.flipcount.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/** Ответ с токеном и данными пользователя. */
@Data
@AllArgsConstructor
public class AuthRequest {
    private String token;
    private String nickname;
    private String email;
}