package com.flipcount.service;

import com.flipcount.dto.*;
import com.flipcount.entity.*;
import com.flipcount.repository.CraftRepository;
import com.flipcount.repository.FormulaRepository;
import com.flipcount.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

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

        Craft craft = new Craft(
                req.getName(),
                req.getFormula(),
                req.getMultiplier() != null ? req.getMultiplier() : 1,
                user
        );

        if (craft.getNodes() == null) craft.setNodes(new ArrayList<>());
        if (craft.getEdges() == null) craft.setEdges(new ArrayList<>());

        crafts.save(craft);

        saveNodesAndEdges(craft, req);

        Formula formula = new Formula();
        formula.setName(req.getName());
        formula.setExpression(req.getFormula());
        formula.setCraftId(craft.getId());
        formula.setIsCraft(true);
        formula.setActive(formulas.findByUserIdOrderByCreatedAtAsc(user.getId()).isEmpty());
        formula.setUser(user);
        formula.setFields(new ArrayList<>());
        formulas.save(formula);

        generateFormulaFields(formula, req);
        formulas.save(formula);

        craft.setFormulaId(formula.getId());
        crafts.save(craft);

        return craft;
    }

    @Transactional
    public Craft update(String email, Long id, CraftRequest req) {
        Craft craft = getOne(email, id);

        craft.setName(req.getName());
        craft.setFormula(req.getFormula());
        craft.setMultiplier(req.getMultiplier() != null ? req.getMultiplier() : 1);

        if (craft.getNodes() == null) craft.setNodes(new ArrayList<>());
        else craft.getNodes().clear();

        if (craft.getEdges() == null) craft.setEdges(new ArrayList<>());
        else craft.getEdges().clear();

        crafts.save(craft);

        saveNodesAndEdges(craft, req);

        if (craft.getFormulaId() != null) {
            formulas.findById(craft.getFormulaId()).ifPresent(f -> {
                f.setName(req.getName());
                f.setExpression(req.getFormula());
                if (f.getFields() != null) f.getFields().clear();
                generateFormulaFields(f, req);
                formulas.save(f);
            });
        }

        return craft;
    }

    private void generateFormulaFields(Formula formula, CraftRequest req) {
        if (req.getNodes() == null) return;
        if (formula.getFields() == null) formula.setFields(new ArrayList<>());

        Set<Long> withIncoming = new HashSet<>();
        if (req.getEdges() != null) {
            for (CraftEdgeDto e : req.getEdges()) {
                withIncoming.add(e.getToNodeId());
            }
        }

        int order = 0;
        // 1. Поля для начального сырья
        for (CraftNodeDto nodeDto : req.getNodes()) {
            Long nodeId = nodeDto.getId();
            if (nodeId != null && withIncoming.contains(nodeId)) continue;

            FormulaField field = new FormulaField();
            field.setLabel(nodeDto.getLabel() != null ? nodeDto.getLabel() : nodeDto.getVariable());
            field.setVariable(nodeDto.getVariable());
            field.setDisplayOrder(order++);
            field.setFormula(formula);

            formula.getFields().add(field);
        }

        // 2. Поле для цены продажи (лота)
        CraftNodeDto saleNode = req.getNodes().stream()
                .filter(n -> Boolean.TRUE.equals(n.getIsSalePoint()))
                .findFirst().orElse(null);

        if (saleNode != null) {
            int lotSize = 1;
            if (req.getEdges() != null) {
                for (CraftEdgeDto e : req.getEdges()) {
                    if (e.getToNodeId().equals(saleNode.getId())) {
                        lotSize = e.getQuantity() != null ? e.getQuantity() : 1;
                        break;
                    }
                }
            }

            FormulaField saleField = new FormulaField();
            saleField.setLabel("Цена продажи (за 1 лот из " + lotSize + " шт)");
            saleField.setVariable("S"); // Короткая переменная
            saleField.setDisplayOrder(order++);
            saleField.setFormula(formula);

            formula.getFields().add(saleField);
        }
    }

    private void saveNodesAndEdges(Craft craft, CraftRequest req) {
        if (craft.getNodes() == null) craft.setNodes(new ArrayList<>());
        if (craft.getEdges() == null) craft.setEdges(new ArrayList<>());

        Map<Long, Long> tempToReal = new HashMap<>();

        if (req.getNodes() != null) {
            for (CraftNodeDto dto : req.getNodes()) {
                CraftNode node = new CraftNode();
                node.setVariable(dto.getVariable());
                node.setLabel(dto.getLabel());
                node.setShape(dto.getShape());
                node.setPosX(dto.getPosX());
                node.setPosY(dto.getPosY());
                node.setItemPrice(dto.getItemPrice());
                node.setOutput(dto.getOutput() != null ? dto.getOutput() : 1);
                node.setSalePrice(dto.getSalePrice());
                node.setIsSalePoint(dto.getIsSalePoint() != null ? dto.getIsSalePoint() : false);
                node.setCraft(craft);

                craft.getNodes().add(node);
            }
            crafts.save(craft);

            for (int i = 0; i < req.getNodes().size(); i++) {
                Long tempId = req.getNodes().get(i).getId();
                Long realId = craft.getNodes().get(i).getId();
                if (tempId != null) tempToReal.put(tempId, realId);
            }
        }

        if (req.getEdges() != null) {
            for (CraftEdgeDto dto : req.getEdges()) {
                Long fromReal = tempToReal.getOrDefault(dto.getFromNodeId(), dto.getFromNodeId());
                Long toReal = tempToReal.getOrDefault(dto.getToNodeId(), dto.getToNodeId());

                CraftEdge edge = new CraftEdge();
                edge.setFromNodeId(fromReal);
                edge.setToNodeId(toReal);
                edge.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 1);
                edge.setCraft(craft);

                craft.getEdges().add(edge);
            }
            crafts.save(craft);
        }
    }

    @Transactional
    public void delete(String email, Long id) {
        Craft c = getOne(email, id);
        if (c.getFormulaId() != null) {
            formulas.findById(c.getFormulaId()).ifPresent(formulas::delete);
        }
        crafts.delete(c);
    }
}