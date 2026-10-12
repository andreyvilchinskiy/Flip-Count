package com.flipcount.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class DealRequest {
    private Long profileId;
    private Long formulaId;
    private Map<String, BigDecimal> values;
    private Integer multiplier = 1;   // 🆕 сколько крафтов за раз
}