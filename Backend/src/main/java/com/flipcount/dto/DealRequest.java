package com.flipcount.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Запрос на создание сделки.
 * values — значения переменных формулы, например { "A": 100, "B": 150 }.
 */
@Data
public class DealRequest {
    private Long profileId;
    private Long formulaId;                // какую формулу использовать
    private Map<String, BigDecimal> values;
}