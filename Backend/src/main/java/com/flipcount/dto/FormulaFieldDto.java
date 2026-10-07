package com.flipcount.dto;

import lombok.Data;

/** Одно поле формулы. */
@Data
public class FormulaFieldDto {
    private String label;
    private String variable;
}