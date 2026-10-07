package com.flipcount.controller;

import com.flipcount.dto.SupportRequest;
import com.flipcount.service.SupportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Отправка сообщения в поддержку (доступна и анонимам). */
@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final SupportService supportService;

    public SupportController(SupportService supportService) {
        this.supportService = supportService;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody SupportRequest req, Authentication auth) {
        String email = (auth != null) ? auth.getName() : null;
        supportService.create(email, req);
        return ResponseEntity.ok("Сообщение отправлено");
    }
}