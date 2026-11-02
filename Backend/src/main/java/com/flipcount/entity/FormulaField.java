package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/** Поле ввода формулы — «Покупка (A)», «Продажа (B)» и т.д. */
@Entity
@Table(name = "formula_fields")
@Getter @Setter @NoArgsConstructor
public class FormulaField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false, length = 5)
    private String variable;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formula_id", nullable = false)
    private Formula formula;
}