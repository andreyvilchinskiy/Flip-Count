package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Сделка — покупка + продажа с рассчитанной прибылью. */
@Entity
@Table(name = "deals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Deal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "buy_price", nullable = false, precision = 19, scale = 2)
    private BigDecimal buyPrice;

    @Column(name = "sell_price", nullable = false, precision = 19, scale = 2)
    private BigDecimal sellPrice;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal profit;

    @Column(name = "formula_used")
    private String formulaUsed;            // название формулы, по которой считали

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id", nullable = false)
    private Profile profile;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}