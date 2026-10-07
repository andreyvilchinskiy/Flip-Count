package com.flipcount.dto;

import lombok.Data;

/** DTO стрелки крафта. */
@Data
public class CraftEdgeDto {
    private Long fromNodeId;               // временный ID источника
    private Long toNodeId;                 // временный ID цели
    private Integer quantity = 1;
}