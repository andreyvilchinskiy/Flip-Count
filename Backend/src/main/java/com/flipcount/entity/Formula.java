package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Формула подсчёта прибыли.
 * Может быть:
 *  - ручной (isCraft = false) — задана пользователем в формуле-настройках
 *  - крафтом (isCraft = true) — создана визуально в редакторе
 */
@Entity
@Table(name = "formulas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Formula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 1000)
    private String expression;            // например: "B - A - B * 0.05"

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = false;       // одна из формул пользователя активна

    @Column(name = "craft_id")
    private Long craftId;                 // если это крафт — ID связанного крафта

    @Column(name = "is_craft", nullable = false)
    @Builder.Default
    private Boolean isCraft = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "formula", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FormulaField> fields;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}