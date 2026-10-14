package com.flipcount.dto;

import lombok.Data;

import java.util.List;

/** Запрос на создание / обновление крафта. */
@Data
public class CraftRequest {
    private String name;
    private String formula;
    private Integer multiplier = 1;
    private List<CraftNodeDto> nodes;
    private List<CraftEdgeDto> edges;
}