package com.flipcount.service;

import com.flipcount.dto.AuthRequest;
import com.flipcount.dto.LoginRequest;
import com.flipcount.dto.RegisterRequest;
import com.flipcount.entity.User;
import com.flipcount.repository.UserRepository;
import com.flipcount.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** Регистрация, вход, получение данных текущего пользователя. */
@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    /** Регистрация нового пользователя. */
    public void register(RegisterRequest req) {
        if (users.existsByEmail(req.getEmail()))
            throw new IllegalArgumentException("Email уже занят");
        if (users.existsByNickname(req.getNickname()))
            throw new IllegalArgumentException("Никнейм уже занят");

        User user = User.builder()
                .nickname(req.getNickname())
                .email(req.getEmail())
                .password(encoder.encode(req.getPassword()))
                .build();
        users.save(user);
    }

    /** Вход — проверяет пароль, возвращает токен и данные пользователя. */
    public AuthRequest login(LoginRequest req) {
        User user = users.findByEmail(req.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Неверный email или пароль"));

        if (!encoder.matches(req.getPassword(), user.getPassword()))
            throw new IllegalArgumentException("Неверный email или пароль");

        String token = jwt.generateToken(user.getEmail());
        return new AuthRequest(token, user.getNickname(), user.getEmail());
    }

    /** Данные текущего пользователя (без токена). */
    public AuthRequest me(String email) {
        User user = users.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
        return new AuthRequest(null, user.getNickname(), user.getEmail());
    }
}