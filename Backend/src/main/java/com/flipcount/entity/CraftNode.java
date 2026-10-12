package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Фигура крафта — прямоугольник, круг или ромб с названием и переменной. */
@Entity
@Table(name = "craft_nodes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CraftNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String variable;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private String shape;

    @Column(name = "pos_x")
    @Builder.Default
    private Double posX = 0.0;

    @Column(name = "pos_y")
    @Builder.Default
    private Double posY = 0.0;

    @Column(name = "item_price")
    private BigDecimal itemPrice;          // цена покупки единицы (опционально)

    @Column(name = "output_amount")
    @Builder.Default
    private Integer output = 1;

    //  цена продажи — только у финального узла
    @Column(name = "sale_price", precision = 19, scale = 2)
    private BigDecimal salePrice;

    // является ли узел точкой продажи
    @Column(name = "is_sale_point")
    @Builder.Default
    private Boolean isSalePoint = false;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "craft_id", nullable = false)
    private Craft craft;
}