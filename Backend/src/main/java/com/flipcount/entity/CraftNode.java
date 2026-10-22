package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Фигура крафта — прямоугольник, круг или ромб с названием и переменной. */
@Entity
@Table(name = "craft_nodes")
@Getter @Setter @NoArgsConstructor
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
    private Double posX = 0.0;

    @Column(name = "pos_y")
    private Double posY = 0.0;

    @Column(name = "item_price")
    private BigDecimal itemPrice;

    @Column(name = "output_amount")
    private Integer output = 1;

    @Column(name = "sale_price", precision = 19, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "is_sale_point")
    private Boolean isSalePoint = false;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "craft_id", nullable = false)
    private Craft craft;
}