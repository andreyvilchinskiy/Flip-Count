package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/** Стрелка между фигурами с числом (количество). */
@Entity
@Table(name = "craft_edges")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CraftEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_node_id", nullable = false)
    private Long fromNodeId;

    @Column(name = "to_node_id", nullable = false)
    private Long toNodeId;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "craft_id", nullable = false)
    private Craft craft;
}