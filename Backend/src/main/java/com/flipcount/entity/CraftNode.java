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
    private String variable;              // "A", "B", "C"...

    @Column(nullable = false)
    private String label;                 // "Бумага"

    @Column(nullable = false)
    private String shape;                 // rect | circle | diamond

    @Column(name = "pos_x")
    @Builder.Default
    private Double posX = 0.0;

    @Column(name = "pos_y")
    @Builder.Default
    private Double posY = 0.0;

    @Column(name = "item_price")
    private BigDecimal itemPrice;         // цена предмета (опционально)

    @Column(name = "output_amount", nullable = false)
    @Builder.Default
    private Integer output = 1;           // сколько единиц производится за 1 крафт

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "craft_id", nullable = false)
    private Craft craft;
}