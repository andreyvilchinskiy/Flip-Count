package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.time.LocalDateTime;
import java.util.List;

/** Крафт — визуально собранный рецепт из фигур и стрелок. */
@Entity
@Table(name = "crafts")
@Getter @Setter @NoArgsConstructor
public class Craft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String formula;

    @Column(name = "formula_id")
    private Long formulaId;

    @Column(nullable = false)
    private Integer multiplier = 1;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "craft", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CraftNode> nodes = new ArrayList<>();

    @OneToMany(mappedBy = "craft", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CraftEdge> edges = new ArrayList<>();

    // Конструктор для безопасного создания
    public Craft(String name, String formula, Integer multiplier, User user) {
        this.name = name;
        this.formula = formula;
        this.multiplier = multiplier;
        this.user = user;
        this.nodes = new ArrayList<>();
        this.edges = new ArrayList<>();
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}