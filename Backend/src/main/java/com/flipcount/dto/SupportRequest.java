package com.flipcount.dto;

import lombok.Data;

/** Сообщение в поддержку. */
@Data
public class SupportRequest {
    private String topic;
    private String message;
}