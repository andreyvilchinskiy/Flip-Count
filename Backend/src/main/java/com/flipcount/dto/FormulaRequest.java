package com.flipcount.dto;

import lombok.Data;

import java.util.List;

/** Создание / обновление формулы. */
@Data
public class FormulaRequest {
    private String name;
    private String expression;
    private List<FormulaFieldDto> fields;
}