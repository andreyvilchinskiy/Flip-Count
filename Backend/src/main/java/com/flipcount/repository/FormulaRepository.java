package com.flipcount.repository;

import com.flipcount.entity.Formula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FormulaRepository extends JpaRepository<Formula, Long> {
    List<Formula> findByUserId(Long userId);
    Optional<Formula> findByUserIdAndActiveTrue(Long userId);
}