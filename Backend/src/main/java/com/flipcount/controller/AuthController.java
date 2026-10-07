package com.flipcount.controller;

import com.flipcount.dto.AuthRequest;
import com.flipcount.dto.LoginRequest;
import com.flipcount.dto.RegisterRequest;
import com.flipcount.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Регистрация, вход, данные текущего пользователя. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        authService.register(req);
        return ResponseEntity.ok("Регистрация успешна");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthRequest> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthRequest> me(Authentication auth) {
        return ResponseEntity.ok(authService.me(auth.getName()));
    }
}