package com.flipcount.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Сообщение в поддержку. Может быть от залогиненного или анонимного. */
@Entity
@Table(name = "support_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SupportMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;                    // может быть null

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}