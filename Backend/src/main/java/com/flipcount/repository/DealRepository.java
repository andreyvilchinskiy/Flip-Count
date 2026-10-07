package com.flipcount.repository;

import com.flipcount.entity.Deal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DealRepository extends JpaRepository<Deal, Long> {
    List<Deal> findByProfileIdOrderByCreatedAtDesc(Long profileId);
}