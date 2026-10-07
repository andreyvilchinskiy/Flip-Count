package com.flipcount.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Глобальный обработчик исключений.
 * Переводит IllegalArgumentException в 400, ошибки валидации — в 400,
 * остальные — в 500.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }

    /** Ошибки валидации DTO (@NotBlank, @Email и т.д.). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .findFirst()
                .orElse("Ошибка валидации");
        return ResponseEntity.badRequest().body(msg);
    }

    /** Все остальные исключения — 500 с сообщением. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception e) {
        e.printStackTrace();
        return ResponseEntity.internalServerError().body("Ошибка сервера: " + e.getMessage());
    }
}