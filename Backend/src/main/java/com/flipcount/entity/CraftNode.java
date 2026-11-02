package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

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

    // Разрешаем null
    @Column(name = "item_price")
    private BigDecimal itemPrice;

    @Column(name = "output_amount")
    private Integer output = 1;

    // Разрешаем null
    @Column(name = "sale_price", precision = 19, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "is_sale_point")
    private Boolean isSalePoint = false;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "craft_id", nullable = false)
    private Craft craft;

    // Страховка от null при сохранении
    @PrePersist
    @PreUpdate
    public void fixNulls() {
        if (output == null) output = 1;
        if (isSalePoint == null) isSalePoint = false;
        if (posX == null) posX = 0.0;
        if (posY == null) posY = 0.0;
    }
}