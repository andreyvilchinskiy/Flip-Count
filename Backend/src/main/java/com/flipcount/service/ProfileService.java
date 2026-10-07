package com.flipcount.service;

import com.flipcount.dto.ProfileRequest;
import com.flipcount.entity.Profile;
import com.flipcount.entity.User;
import com.flipcount.repository.ProfileRepository;
import com.flipcount.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** CRUD профилей + активация + смена аватара. */
@Service
public class ProfileService {

    private final ProfileRepository profiles;
    private final UserRepository users;

    public ProfileService(ProfileRepository profiles, UserRepository users) {
        this.profiles = profiles;
        this.users = users;
    }

    private User currentUser(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
    }

    public List<Profile> list(String email) {
        return profiles.findByUserId(currentUser(email).getId());
    }

    public Profile getOne(String email, Long profileId) {
        Profile p = profiles.findById(profileId)
                .orElseThrow(() -> new IllegalArgumentException("Профиль не найден"));
        if (!p.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");
        return p;
    }

    public Profile create(String email, ProfileRequest req) {
        User user = currentUser(email);
        boolean first = profiles.findByUserId(user.getId()).isEmpty();

        Profile profile = Profile.builder()
                .name(req.getName())
                .imageUrl(req.getImageUrl())
                .user(user)
                .active(first)          // первый профиль сразу активен
                .build();
        return profiles.save(profile);
    }

    public Profile update(String email, Long profileId, ProfileRequest req) {
        Profile p = getOne(email, profileId);
        if (req.getName() != null && !req.getName().isBlank()) {
            p.setName(req.getName());
        }
        return profiles.save(p);
    }

    /** Переключить активный профиль (все остальные становятся неактивными). */
    @Transactional
    public void activate(String email, Long profileId) {
        User user = currentUser(email);
        List<Profile> all = profiles.findByUserId(user.getId());

        boolean found = false;
        for (Profile p : all) {
            boolean isTarget = p.getId().equals(profileId);
            if (isTarget) found = true;
            p.setActive(isTarget);
            profiles.save(p);
        }
        if (!found) throw new IllegalArgumentException("Профиль не найден");
    }

    /** Установить путь к аватару. */
    @Transactional
    public void setAvatar(String email, Long profileId, String avatarUrl) {
        Profile p = getOne(email, profileId);
        p.setAvatarPath(avatarUrl);
        profiles.save(p);
    }

    public void delete(String email, Long profileId) {
        Profile p = getOne(email, profileId);
        profiles.delete(p);
    }
}