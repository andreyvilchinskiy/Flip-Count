package com.flipcount.controller;

import com.flipcount.dto.ProfileRequest;
import com.flipcount.entity.Profile;
import com.flipcount.service.ProfileService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

/** CRUD профилей + загрузка аватаров. */
@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService profileService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public List<Profile> list(Authentication auth) {
        return profileService.list(auth.getName());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Profile> getOne(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(profileService.getOne(auth.getName(), id));
    }

    @PostMapping
    public ResponseEntity<Profile> create(@RequestBody ProfileRequest req, Authentication auth) {
        return ResponseEntity.ok(profileService.create(auth.getName(), req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Profile> update(@PathVariable Long id,
                                          @RequestBody ProfileRequest req,
                                          Authentication auth) {
        return ResponseEntity.ok(profileService.update(auth.getName(), id, req));
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<?> activate(@PathVariable Long id, Authentication auth) {
        profileService.activate(auth.getName(), id);
        return ResponseEntity.ok("Активирован");
    }

    @PostMapping("/{id}/avatar")
    public ResponseEntity<?> uploadAvatar(@PathVariable Long id,
                                          @RequestParam("file") MultipartFile file,
                                          Authentication auth) {
        try {
            // Проверка типа файла
            String contentType = file.getContentType();
            if (contentType == null ||
                    !(contentType.equals("image/jpeg") ||
                            contentType.equals("image/jpg") ||
                            contentType.equals("image/png"))) {
                return ResponseEntity.badRequest().body("Разрешены только JPG и PNG");
            }

            // Создаём папку
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Сохраняем файл с уникальным именем
            String ext = contentType.equals("image/png") ? ".png" : ".jpg";
            String filename = UUID.randomUUID() + ext;
            Path target = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            // Обновляем профиль
            String avatarUrl = "/uploads/avatars/" + filename;
            profileService.setAvatar(auth.getName(), id, avatarUrl);

            return ResponseEntity.ok(avatarUrl);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Ошибка загрузки: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        profileService.delete(auth.getName(), id);
        return ResponseEntity.ok("Удалено");
    }
}