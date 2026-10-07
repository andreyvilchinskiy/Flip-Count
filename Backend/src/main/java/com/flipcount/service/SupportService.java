package com.flipcount.service;

import com.flipcount.dto.SupportRequest;
import com.flipcount.entity.SupportMessage;
import com.flipcount.entity.User;
import com.flipcount.repository.SupportRepository;
import com.flipcount.repository.UserRepository;
import org.springframework.stereotype.Service;

/** Сохранение сообщений в поддержку. */
@Service
public class SupportService {

    private final SupportRepository support;
    private final UserRepository users;

    public SupportService(SupportRepository support, UserRepository users) {
        this.support = support;
        this.users = users;
    }

    /** Создаёт сообщение. email может быть null (аноним). */
    public void create(String email, SupportRequest req) {
        User user = null;
        if (email != null) {
            user = users.findByEmail(email).orElse(null);
        }

        SupportMessage msg = SupportMessage.builder()
                .topic(req.getTopic())
                .message(req.getMessage())
                .user(user)
                .build();
        support.save(msg);
    }
}