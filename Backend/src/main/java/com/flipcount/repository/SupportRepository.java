package com.flipcount.repository;

import com.flipcount.entity.SupportMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportRepository extends JpaRepository<SupportMessage, Long> {
}