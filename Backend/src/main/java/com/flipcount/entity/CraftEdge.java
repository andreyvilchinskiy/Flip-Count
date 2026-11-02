package com.flipcount.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "craft_edges")
@Getter @Setter @NoArgsConstructor
public class CraftEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_node_id", nullable = false)
    private Long fromNodeId;

    @Column(name = "to_node_id", nullable = false)
    private Long toNodeId;

    @Column(nullable = false)
    private Integer quantity = 1;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "craft_id", nullable = false)
    private Craft craft;

    @PrePersist
    @PreUpdate
    public void fixNulls() {
        if (quantity == null) quantity = 1;
    }
}