package com.flipcount.controller;

import com.flipcount.dto.BatchDeleteRequest;
import com.flipcount.dto.DealRequest;
import com.flipcount.entity.Deal;
import com.flipcount.service.DealService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Создание, список и удаление сделок. */
@RestController
@RequestMapping("/api/deals")
public class DealController {

    private final DealService dealService;

    public DealController(DealService dealService) {
        this.dealService = dealService;
    }

    @PostMapping
    public ResponseEntity<Deal> create(@RequestBody DealRequest req, Authentication auth) {
        return ResponseEntity.ok(dealService.create(auth.getName(), req));
    }

    @GetMapping("/profile/{profileId}")
    public ResponseEntity<List<Deal>> list(@PathVariable Long profileId, Authentication auth) {
        return ResponseEntity.ok(dealService.listByProfile(auth.getName(), profileId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        dealService.delete(auth.getName(), id);
        return ResponseEntity.ok("Удалено");
    }

    @DeleteMapping("/batch")
    public ResponseEntity<?> deleteBatch(@RequestBody BatchDeleteRequest req, Authentication auth) {
        if (req.getIds() == null || req.getIds().isEmpty()) {
            return ResponseEntity.badRequest().body("Список пуст");
        }
        dealService.deleteBatch(auth.getName(), req.getIds());
        return ResponseEntity.ok("Удалено: " + req.getIds().size());
    }
}