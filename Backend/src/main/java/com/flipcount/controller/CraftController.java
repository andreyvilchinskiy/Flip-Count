package com.flipcount.controller;

import com.flipcount.dto.CraftRequest;
import com.flipcount.entity.Craft;
import com.flipcount.service.CraftService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** CRUD крафтов. */
@RestController
@RequestMapping("/api/crafts")
public class CraftController {

    private final CraftService craftService;

    public CraftController(CraftService craftService) {
        this.craftService = craftService;
    }

    @GetMapping
    public List<Craft> list(Authentication auth) {
        return craftService.list(auth.getName());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Craft> getOne(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(craftService.getOne(auth.getName(), id));
    }

    @PostMapping
    public ResponseEntity<Craft> create(@RequestBody CraftRequest req, Authentication auth) {
        return ResponseEntity.ok(craftService.create(auth.getName(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Craft> update(@PathVariable Long id,
                                        @RequestBody CraftRequest req,
                                        Authentication auth) {
        return ResponseEntity.ok(craftService.update(auth.getName(), id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        craftService.delete(auth.getName(), id);
        return ResponseEntity.ok("Удалено");
    }
}