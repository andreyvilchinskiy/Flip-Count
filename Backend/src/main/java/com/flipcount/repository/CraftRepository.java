package com.flipcount.repository;

import com.flipcount.entity.Craft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CraftRepository extends JpaRepository<Craft, Long> {
    List<Craft> findByUserId(Long userId);
}