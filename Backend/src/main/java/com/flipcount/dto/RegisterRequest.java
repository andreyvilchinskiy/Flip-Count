package com.flipcount.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/** Данные регистрации. Валидация через jakarta.validation. */
@Data
public class RegisterRequest {

    @NotBlank(message = "Никнейм обязателен")
    @Size(min = 3, max = 30, message = "Никнейм 3–30 символов")
    private String nickname;

    @NotBlank(message = "Email обязателен")
    @Email(message = "Некорректный email")
    private String email;

    @NotBlank(message = "Пароль обязателен")
    @Size(min = 6, message = "Пароль минимум 6 символов")
    private String password;
}