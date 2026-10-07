package com.flipcount.dto;

import lombok.Data;

import java.util.List;

/** Список ID для массового удаления сделок. */
@Data
public class BatchDeleteRequest {
    private List<Long> ids;
}