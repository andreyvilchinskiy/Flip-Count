package com.flipcount.dto;

import lombok.Data;

import java.math.BigDecimal;

/** DTO фигуры крафта (для передачи с фронта). */
@Data
public class CraftNodeDto {
    private Long id;                       // временный ID (нужен для связей между узлами)
    private String variable;
    private String label;
    private String shape;
    private Double posX;
    private Double posY;
    private BigDecimal itemPrice;
    private Integer output = 1;
}