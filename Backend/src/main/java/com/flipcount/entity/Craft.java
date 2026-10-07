package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/** Крафт — визуально собранный рецепт из фигур и стрелок. */
@Entity
@Table(name = "crafts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Craft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String formula;               // текст формулы (например, "((A × 4) + (C × 2)) × 2 = E")

    @Column(name = "formula_id")
    private Long formulaId;               // ID связанной Formula (создаётся автоматически)

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "craft", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CraftNode> nodes;

    @OneToMany(mappedBy = "craft", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CraftEdge> edges;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}