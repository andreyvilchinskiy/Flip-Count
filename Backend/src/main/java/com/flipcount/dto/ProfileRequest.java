package com.flipcount.dto;

import lombok.Data;

/** Создание / обновление профиля. */
@Data
public class ProfileRequest {
    private String name;
    private String imageUrl;
}