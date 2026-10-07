package com.flipcount.service;

import com.flipcount.dto.*;
import com.flipcount.entity.*;
import com.flipcount.repository.CraftRepository;
import com.flipcount.repository.FormulaRepository;
import com.flipcount.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * CRUD крафтов.
 * При создании/обновлении крафта автоматически создаётся/обновляется
 * связанная Formula, чтобы крафт появился в списке формул.
 */
@Service
public class CraftService {

    private final CraftRepository crafts;
    private final UserRepository users;
    private final FormulaRepository formulas;

    public CraftService(CraftRepository crafts,
                        UserRepository users,
                        FormulaRepository formulas) {
        this.crafts = crafts;
        this.users = users;
        this.formulas = formulas;
    }

    private User currentUser(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
    }

    public List<Craft> list(String email) {
        return crafts.findByUserId(currentUser(email).getId());
    }

    public Craft getOne(String email, Long id) {
        Craft c = crafts.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Крафт не найден"));
        if (!c.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");
        return c;
    }

    @Transactional
    public Craft create(String email, CraftRequest req) {
        User user = currentUser(email);

        // 1. Создаём сам крафт
        Craft craft = Craft.builder()
                .name(req.getName())
                .formula(req.getFormula())
                .user(user)
                .build();
        crafts.save(craft);

        // 2. Создаём узлы и стрелки
        saveNodesAndEdges(craft, req);

        // 3. Создаём связанную формулу
        Formula formula = Formula.builder()
                .name(req.getName())
                .expression(req.getFormula())
                .craftId(craft.getId())
                .isCraft(true)
                .active(formulas.findByUserId(user.getId()).isEmpty())  // первый — активный
                .user(user)
                .build();
        formulas.save(formula);

        craft.setFormulaId(formula.getId());
        crafts.save(craft);

        return craft;
    }

    @Transactional
    public Craft update(String email, Long id, CraftRequest req) {
        Craft craft = getOne(email, id);

        // Обновляем основные поля
        craft.setName(req.getName());
        craft.setFormula(req.getFormula());

        // Очищаем старые узлы и рёбра
        craft.getNodes().clear();
        craft.getEdges().clear();
        crafts.save(craft);

        // Создаём новые
        saveNodesAndEdges(craft, req);

        // Обновляем связанную формулу
        if (craft.getFormulaId() != null) {
            formulas.findById(craft.getFormulaId()).ifPresent(f -> {
                f.setName(req.getName());
                f.setExpression(req.getFormula());
                formulas.save(f);
            });
        }

        return craft;
    }

    /**
     * Сохраняет узлы и рёбра для крафта.
     * Из-за того что узлы и рёбра приходят с временными ID,
     * после сохранения узлов строится маппинг tempId → realId.
     */
    private void saveNodesAndEdges(Craft craft, CraftRequest req) {
        Map<Long, Long> tempToReal = new HashMap<>();

        // Узлы
        if (req.getNodes() != null) {
            for (CraftNodeDto dto : req.getNodes()) {
                craft.getNodes().add(CraftNode.builder()
                        .variable(dto.getVariable())
                        .label(dto.getLabel())
                        .shape(dto.getShape())
                        .posX(dto.getPosX())
                        .posY(dto.getPosY())
                        .itemPrice(dto.getItemPrice())
                        .output(dto.getOutput() != null ? dto.getOutput() : 1)
                        .craft(craft)
                        .build());
            }
            crafts.save(craft);

            // Строим маппинг временных ID → реальных
            for (int i = 0; i < req.getNodes().size(); i++) {
                Long tempId = req.getNodes().get(i).getId();
                Long realId = craft.getNodes().get(i).getId();
                if (tempId != null) tempToReal.put(tempId, realId);
            }
        }

        // Рёбра
        if (req.getEdges() != null) {
            for (CraftEdgeDto dto : req.getEdges()) {
                Long fromReal = tempToReal.getOrDefault(dto.getFromNodeId(), dto.getFromNodeId());
                Long toReal = tempToReal.getOrDefault(dto.getToNodeId(), dto.getToNodeId());

                craft.getEdges().add(CraftEdge.builder()
                        .fromNodeId(fromReal)
                        .toNodeId(toReal)
                        .quantity(dto.getQuantity() != null ? dto.getQuantity() : 1)
                        .craft(craft)
                        .build());
            }
            crafts.save(craft);
        }
    }

    /** Удаляет крафт вместе с его формулой. */
    @Transactional
    public void delete(String email, Long id) {
        Craft c = getOne(email, id);

        if (c.getFormulaId() != null) {
            formulas.findById(c.getFormulaId()).ifPresent(formulas::delete);
        }
        crafts.delete(c);
    }
}