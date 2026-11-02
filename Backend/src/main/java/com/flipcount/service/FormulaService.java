package com.flipcount.service;

import com.flipcount.dto.FormulaFieldDto;
import com.flipcount.dto.FormulaRequest;
import com.flipcount.entity.Formula;
import com.flipcount.entity.FormulaField;
import com.flipcount.entity.User;
import com.flipcount.repository.FormulaRepository;
import com.flipcount.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** CRUD формул + активация. */
@Service
public class FormulaService {

    private final FormulaRepository formulas;
    private final UserRepository users;

    public FormulaService(FormulaRepository formulas, UserRepository users) {
        this.formulas = formulas;
        this.users = users;
    }

    private User currentUser(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден"));
    }

    public List<Formula> list(String email) {
        return formulas.findByUserIdOrderByCreatedAtAsc(currentUser(email).getId());
    }

    public Formula getOne(String email, Long id) {
        Formula f = formulas.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Формула не найдена"));
        if (!f.getUser().getEmail().equals(email))
            throw new IllegalArgumentException("Нет доступа");
        return f;
    }

    /** Активная формула пользователя или null. */
    public Formula getActive(String email) {
        return formulas.findByUserIdAndActiveTrue(currentUser(email).getId())
                .orElse(null);
    }

    @Transactional
    public Formula create(String email, FormulaRequest req) {
        User user = currentUser(email);

        Formula formula = new Formula();
        formula.setName(req.getName());
        formula.setExpression(req.getExpression());
        formula.setUser(user);
        formula.setActive(formulas.findByUserIdOrderByCreatedAtAsc(user.getId()).isEmpty());
        formula.setFields(new ArrayList<>()); // Важно: инициализация списка
        formulas.save(formula);

        // Создаём поля
        if (req.getFields() != null) {
            List<FormulaField> fields = new ArrayList<>();
            int order = 0;
            for (FormulaFieldDto f : req.getFields()) {
                FormulaField field = new FormulaField();
                field.setLabel(f.getLabel());
                field.setVariable(f.getVariable());
                field.setDisplayOrder(order++);
                field.setFormula(formula);
                fields.add(field);
            }
            formula.setFields(fields);
            formulas.save(formula);
        }

        return formula;
    }

    @Transactional
    public Formula update(String email, Long id, FormulaRequest req) {
        Formula f = getOne(email, id);
        f.setName(req.getName());
        f.setExpression(req.getExpression());

        // Удаляем старые поля
        if (f.getFields() != null) {
            f.getFields().clear();
        } else {
            f.setFields(new ArrayList<>());
        }

        formulas.save(f);

        // Добавляем новые
        if (req.getFields() != null) {
            int order = 0;
            for (FormulaFieldDto dto : req.getFields()) {
                FormulaField field = new FormulaField();
                field.setLabel(dto.getLabel());
                field.setVariable(dto.getVariable());
                field.setDisplayOrder(order++);
                field.setFormula(f);

                f.getFields().add(field);
            }
        }
        return formulas.save(f);
    }

    /** Сделать формулу активной (остальные — неактивны). */
    @Transactional
    public void activate(String email, Long formulaId) {
        User user = currentUser(email);
        List<Formula> all = formulas.findByUserIdOrderByCreatedAtAsc(user.getId());

        boolean found = false;
        for (Formula f : all) {
            boolean isTarget = f.getId().equals(formulaId);
            if (isTarget) found = true;
            f.setActive(isTarget);
            formulas.save(f);
        }
        if (!found) throw new IllegalArgumentException("Формула не найдена");
    }

    public void delete(String email, Long id) {
        Formula f = getOne(email, id);
        formulas.delete(f);
    }
}