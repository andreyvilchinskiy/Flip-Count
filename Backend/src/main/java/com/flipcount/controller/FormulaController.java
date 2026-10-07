package com.flipcount.controller;

import com.flipcount.dto.FormulaRequest;
import com.flipcount.entity.Formula;
import com.flipcount.service.FormulaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** CRUD формул + активация. */
@RestController
@RequestMapping("/api/formulas")
public class FormulaController {

    private final FormulaService formulaService;

    public FormulaController(FormulaService formulaService) {
        this.formulaService = formulaService;
    }

    @GetMapping
    public List<Formula> list(Authentication auth) {
        return formulaService.list(auth.getName());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Formula> getOne(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(formulaService.getOne(auth.getName(), id));
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActive(Authentication auth) {
        Formula f = formulaService.getActive(auth.getName());
        return f != null ? ResponseEntity.ok(f) : ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<Formula> create(@RequestBody FormulaRequest req, Authentication auth) {
        return ResponseEntity.ok(formulaService.create(auth.getName(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Formula> update(@PathVariable Long id,
                                          @RequestBody FormulaRequest req,
                                          Authentication auth) {
        return ResponseEntity.ok(formulaService.update(auth.getName(), id, req));
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<?> activate(@PathVariable Long id, Authentication auth) {
        formulaService.activate(auth.getName(), id);
        return ResponseEntity.ok("Активирована");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        formulaService.delete(auth.getName(), id);
        return ResponseEntity.ok("Удалено");
    }
}